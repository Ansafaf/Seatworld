import { Product, ProductVariant } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
import Cart from "../models/cartModel.js";
import Wishlist from "../models/wishlistModel.js";
import { buildBreadcrumb } from "../utils/breadcrumb.js";
import { paginate } from "../utils/paginationHelper.js";
import { Offer } from "../models/offerModel.js";
import * as offerHelper from "../utils/offerHelper.js";
import { escapeRegExp } from "../utils/regexHelper.js";
import { status_Codes } from "../enums/statusCodes.js";


const normalizeQuery = (query) => {
    const normalizeArr = (value) => {
        if (!value) return [];
        return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
    };

    const normalizeValue = (value, fallback, filterValue = "all") => {
        const arr = normalizeArr(value).filter((v) => v !== filterValue);
        return arr;
    };

    return {
        selectedCategories: normalizeValue(query.category),
        selectedBrands: normalizeValue(query.brand),
        selectedColors: normalizeValue(query.color).map(c => c.trim().toLowerCase()),
        sort: query.sort || "featured",
        page: Math.max(1, parseInt(query.page, 10) || 1),
        limit: 9,
        stock: query.stock,
        discount: query.discount,
        search: query.search,
        minPrice: Number(query.minPrice),
        maxPrice: Number(query.maxPrice)
    };
};


const buildBaseFilter = (params) => {
    const { selectedCategories, selectedBrands, discount, search } = params;
    const filter = { isBlocked: { $ne: true } };

    if (selectedCategories.length) filter.categoryId = { $in: selectedCategories };
    if (selectedBrands.length) filter.brand = { $in: selectedBrands };
    if (discount === 'true') filter.offerId = { $ne: null, $exists: true };

    if (search) {
        const escapedSearch = escapeRegExp(search);
        filter.$or = [
            { name: { $regex: escapedSearch, $options: "i" } },
            { brand: { $regex: escapedSearch, $options: "i" } },
            { description: { $regex: escapedSearch, $options: "i" } },
        ];
    }

    return { filter };
};

// Helper: Apply variant-based filtering (color, stock, price)
const applyVariantFilters = async (filter, params) => {
    const { selectedColors, stock, minPrice, maxPrice } = params;

    const hasMinPrice = !Number.isNaN(minPrice) && minPrice > 0;
    const hasMaxPrice = !Number.isNaN(maxPrice) && maxPrice > 0;

    // We no longer return early here because we ALWAYS want to filter out products that have NO active/in-stock variants
    // even if no specific filters are applied.

    // First find products matching basic filters to narrow down variant search
    const products = await Product.find(filter).select('_id').lean();
    const productIds = products.map(p => p._id);

    const variantFilter = {
        productId: { $in: productIds },
        status: "Active",
        stock: { $gt: 0 } // Only show items with actual stock in the list
    };

    // Add color filter
    if (selectedColors.length) {
        variantFilter.color = {
            $in: selectedColors.map(c => new RegExp(`^${escapeRegExp(c)}$`, 'i'))
        };
    }

    // Add stock filter
    if (stock === 'instock') {
        variantFilter.stock = { $gt: 0 };
    } else if (stock === 'outofstock') {
        variantFilter.stock = { $lte: 0 };
    }

    // Add price filter based on variant prices
    if (hasMinPrice || hasMaxPrice) {
        variantFilter.price = {};
        if (hasMinPrice) variantFilter.price.$gte = minPrice;
        if (hasMaxPrice) variantFilter.price.$lte = maxPrice;
    }

    const matchingVariants = await ProductVariant.find(variantFilter).select('productId').lean();
    const filteredProductIds = [...new Set(matchingVariants.map(v => v.productId.toString()))];

    filter._id = { $in: filteredProductIds };
    return { filter, hasMinPrice, hasMaxPrice };
};

// Helper: Map sort values to MongoDB sort objects
const getSortOption = (sort) => {
    const sortMap = {
        featured: { createdAt: -1 },
        newest: { createdAt: -1 },
        "price-low": { Baseprice: 1 },
        "price-high": { Baseprice: -1 },
        name: { name: 1 },
    };
    return sortMap[sort] || sortMap.featured;
};

// Helper: Enrich products with variant details AND offers
const enrichProducts = async (products, activeOffers) => {
    return Promise.all(
        products.map(async (product) => {
            const variant = await ProductVariant.findOne({
                productId: product._id,
                status: "Active",
                stock: { $gt: 0 }
            });

            const basePrice = variant ? variant.price : product.Baseprice;
            const discountData = offerHelper.calculateDiscount(product, basePrice, activeOffers);

            return {
                ...product,
                variant: variant ? variant.toObject() : null,
                image: (variant && variant.images && variant.images.length > 0) ? variant.images[0] : null,
                stock: variant ? variant.stock : 0,
                color: variant ? variant.color : null,
                ...discountData
            };
        })
    );
};


// Helper: Prepare UI elements (query string, heading, filter count)
const prepareUIHelpers = (params, categories, minPriceValue, maxPriceValue) => {
    const {
        selectedCategories, selectedBrands, selectedColors,
        hasMinPrice, hasMaxPrice, minPrice, maxPrice, search, stock, discount, sort, limit
    } = params;

    const queryParams = new URLSearchParams();
    selectedCategories.forEach(cat => queryParams.append("category", cat));
    selectedBrands.forEach(b => queryParams.append("brand", b));
    selectedColors.forEach(c => queryParams.append("color", c));

    if (hasMinPrice) queryParams.append("minPrice", minPrice);
    if (hasMaxPrice) queryParams.append("maxPrice", maxPrice);
    if (search) queryParams.append("search", search);
    if (stock) queryParams.append("stock", stock);
    if (discount === 'true') queryParams.append("discount", "true");
    if (sort && sort !== "featured") queryParams.append("sort", sort);
    // Limit is now fixed to 9, no need to append to query string

    const heading = selectedCategories.length === 1
        ? categories.find(cat => cat._id.toString() === selectedCategories[0])?.categoryName || "Products"
        : "Products";

    const appliedFiltersCount =
        selectedCategories.length +
        selectedBrands.length +
        selectedColors.length +
        (search ? 1 : 0) +
        (stock ? 1 : 0) +
        (discount === 'true' ? 1 : 0) +
        (hasMinPrice && minPrice > minPriceValue ? 1 : 0) +
        (hasMaxPrice && maxPrice < maxPriceValue ? 1 : 0);

    return { queryString: queryParams.toString(), heading, appliedFiltersCount };
};

export async function getProducts(req, res) {
    try {

        const params = normalizeQuery(req.query);

        const { filter } = buildBaseFilter(params);

        const categories = await Category.find({ isActive: true }).lean();
        const activeCategoryIds = categories.map(cat => cat._id.toString());

        // Ensure we only show products from active categories
        filter.categoryId = { $in: activeCategoryIds };

        if (params.selectedCategories.length) {

            const userSelectedActive = params.selectedCategories.filter(id => activeCategoryIds.includes(id));
            filter.categoryId = { $in: userSelectedActive };
        }
        const [brandsDistinct, priceStats] = await Promise.all([
            Product.distinct("brand"),
            ProductVariant.aggregate([
                { $match: { status: "Active" } },
                { $group: { _id: null, minPrice: { $min: "$price" }, maxPrice: { $max: "$price" } } },
            ]),
        ]);

        const minPriceValue = priceStats[0]?.minPrice ?? 0;
        const maxPriceValue = priceStats[0]?.maxPrice ?? 0;

        const { filter: finalFilter, hasMinPrice, hasMaxPrice } = await applyVariantFilters(filter, params);

        const priceRange = {
            min: minPriceValue,
            max: maxPriceValue,
            selectedMin: hasMinPrice ? params.minPrice : minPriceValue,
            selectedMax: hasMaxPrice ? params.maxPrice : maxPriceValue,
        };

        const sortOption = getSortOption(params.sort);

        const { items: products, pagination } = await paginate(Product, finalFilter, {
            page: params.page,
            limit: params.limit,
            sort: sortOption,
            populate: ["categoryId", "offerId"]
        });

        const activeOffers = await Offer.find({ isActive: true });
        const productsWithVariants = await enrichProducts(products, activeOffers);

        let wishlistVariantIds = [];
        if (req.session.user && req.session.user.id) {
            const userWishlist = await Wishlist.find({ userId: req.session.user.id }).select("variantId");
            wishlistVariantIds = userWishlist.map(item => item.variantId?.toString()).filter(Boolean);
        }

        const productsWithWishlist = productsWithVariants.map(product => ({
            ...product,
            isInWishlist: product.variant && wishlistVariantIds.includes(product.variant._id.toString())
        }));


        let finalProducts = productsWithWishlist;
        if (hasMinPrice || hasMaxPrice) {
            finalProducts = productsWithWishlist.filter(product => {
                const displayPrice = product.discountedPrice || product.originalPrice || 0;
                if (hasMinPrice && displayPrice < params.minPrice) return false;
                if (hasMaxPrice && displayPrice > params.maxPrice) return false;
                return true;
            });
        }

        const rawColors = await ProductVariant.distinct("color", { status: "Active" });
        const availableColors = [...new Set(rawColors.filter(Boolean).map(c => c.trim().toLowerCase()))]
            .sort();

        const rawBrands = brandsDistinct.filter(Boolean);
        const brands = [...new Set(rawBrands.map(b => b.trim()))].sort();



        // 7. Prepare UI Helpers
        const { queryString, heading, appliedFiltersCount } = prepareUIHelpers(params, categories, minPriceValue, maxPriceValue);

        const sortOptions = [
            { value: "featured", label: "Featured" },
            { value: "newest", label: "Newest" },
            { value: "price-low", label: "Price: Low to High" },
            { value: "price-high", label: "Price: High to Low" },
            { value: "name", label: "Name A-Z" },
        ];

        const logoUrl = process.env.LOGO_URL || process.env.SEATWORLD_LOGO_URL || null;

        // 8. Render
        res.render("users/productList", {
            user: req.session.user,
            products: finalProducts,
            categories,
            brands,
            colors: availableColors,
            priceRange,
            logoUrl,
            sortOptions,
            appliedFiltersCount,
            pagination,
            filters: {
                categories: params.selectedCategories,
                brands: params.selectedBrands,
                colors: params.selectedColors,
                minPrice: hasMinPrice ? params.minPrice : null,
                maxPrice: hasMaxPrice ? params.maxPrice : null,
                search: params.search || "",
                sort: params.sort || "featured",
                stock: params.stock || "",
                discount: params.discount || "",
                heading,
            },
            query: queryString,
            breadcrumbs: buildBreadcrumb([{ label: "Products", url: "/products" }])
        });

    } catch (err) {
        console.error("Error fetching products:", err);
        const logoUrl = process.env.LOGO_URL || process.env.SEATWORLD_LOGO_URL || null;
        res.render("users/productList", {
            error: "Failed to load products",
            products: [],
            categories: [],
            brands: [],
            colors: [],
            priceRange: { min: 0, max: 0, selectedMin: 0, selectedMax: 0 },
            logoUrl,
            sortOptions: [
                { value: "featured", label: "Featured" },
                { value: "newest", label: "Newest" },
                { value: "price-low", label: "Price: Low to High" },
                { value: "price-high", label: "Price: High to Low" },
                { value: "name", label: "Name A-Z" },
            ],
            appliedFiltersCount: 0,
            pagination: {
                currentPage: 1,
                totalPages: 1,
                totalItems: 0,
                itemsPerPage: 12,
                hasNext: false,
                hasPrev: false,
            },
            filters: {
                categories: [],
                brands: [],
                colors: [],
                minPrice: 0,
                maxPrice: 0,
                search: "",
                sort: "featured",
                stock: "",
                discount: "",
                heading: "Products",
            },
            query: "",
            breadcrumbs: buildBreadcrumb([{ label: "Products", url: "/products" }])
        });
    }
}

export async function getProductdetail(req, res) {
    try {
        const productId = req.params.id;
        const variantId = req.query.variant;

        const product = await Product.findOne({ _id: productId, isBlocked: { $ne: true } })
            .populate('categoryId')
            .lean();


        if (!product || (product.categoryId && product.categoryId.isActive === false)) {
            return res.status(status_Codes.NOT_FOUND).render("404");
        }

        const variants = await ProductVariant.find({ productId: productId, status: { $in: ["Active", "OutofStock"] } }).lean();

        let selectedVariant = null;
        if (variantId) {
            selectedVariant = variants.find(v => v._id.toString() === variantId);
        }

        if (!selectedVariant && variants.length > 0) {
            selectedVariant = variants[0];
        }

        const activeOffers = await Offer.find({ isActive: true });
        const basePrice = selectedVariant ? selectedVariant.price : product.Baseprice;
        const discountData = offerHelper.calculateDiscount(product, basePrice, activeOffers);

        const displayProduct = {
            ...product,
            price: discountData.discountedPrice,
            originalPrice: discountData.originalPrice,
            hasOffer: discountData.hasOffer,
            discountPercentage: discountData.discountPercentage,
            image: (selectedVariant && selectedVariant.images && selectedVariant.images.length > 0)
                ? selectedVariant.images[0]
                : "",
            stock: selectedVariant ? selectedVariant.stock : 0,
            variant: selectedVariant,
            variants: variants.map(v => {
                const vDiscount = offerHelper.calculateDiscount(product, v.price, activeOffers);
                return {
                    ...v,
                    discountedPrice: vDiscount.discountedPrice,
                    hasOffer: vDiscount.hasOffer,
                    discountPercentage: vDiscount.discountPercentage
                };
            })
        };


        const relatedProducts = await Product.aggregate([
            { $match: { categoryId: product.categoryId?._id || product.categoryId, _id: { $ne: product._id } } },
            { $sample: { size: 4 } }
        ]);

        const relatedProductsWithImages = await Promise.all(relatedProducts.map(async (rp) => {
            const v = await ProductVariant.findOne({ productId: rp._id, status: { $in: ["Active", "OutofStock"] } });
            const basePrice = v ? v.price : rp.Baseprice;
            const discountData = offerHelper.calculateDiscount(rp, basePrice, activeOffers);

            return {
                ...rp,
                image: (v && v.images && v.images.length > 0) ? v.images[0] : "",
                price: discountData.discountedPrice,
                originalPrice: discountData.originalPrice,
                hasOffer: discountData.hasOffer
            };
        }));

        const logoUrl = process.env.LOGO_URL || process.env.SEATWORLD_LOGO_URL || null;
        const cartCount = req.session.user ? await Cart.countDocuments({ userId: req.session.user.id }) : 0;

        // Check if product (variant) is in wishlist
        const isInWishlist = req.session.user && selectedVariant
            ? await Wishlist.exists({ userId: req.session.user.id, variantId: selectedVariant._id })
            : false;

        res.render("users/productDetails", {
            product: displayProduct,
            relatedProducts: relatedProductsWithImages,
            logoUrl,
            cartCount,
            isInWishlist: !!isInWishlist,
            breadcrumbs: buildBreadcrumb([
                { label: "Products", url: "/products" },
                { label: displayProduct.name, url: `/product/${displayProduct._id}` }
            ])
        });

    } catch (err) {
        res.status(status_Codes.INTERNAL_SERVER_ERROR).send("Internal Server Error");
    }
}


