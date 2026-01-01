import { Product, ProductVariant } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
import { buildBreadcrumb } from "../utils/breadcrumb.js";


// Helper: Normalize query params into arrays and apply defaults
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
        selectedColors: normalizeValue(query.color),
        selectedTags: normalizeValue(query.tag),
        sort: query.sort || "featured",
        page: Math.max(1, parseInt(query.page, 10) || 1),
        limit: Math.max(1, parseInt(query.limit, 10) || 8),
        stock: query.stock,
        discount: query.discount,
        search: query.search,
        minPrice: Number(query.minPrice),
        maxPrice: Number(query.maxPrice)
    };
};

// Helper: Build base product filter
const buildBaseFilter = (params) => {
    const { selectedCategories, selectedBrands, selectedTags, discount, search, minPrice, maxPrice } = params;
    const filter = { isBlocked: { $ne: true } };

    if (selectedCategories.length) filter.categoryId = { $in: selectedCategories };
    if (selectedBrands.length) filter.brand = { $in: selectedBrands };
    if (selectedTags.length) filter.tags = { $in: selectedTags };
    if (discount === 'true') filter.offerId = { $ne: null, $exists: true };

    const hasMinPrice = !Number.isNaN(minPrice) && minPrice > 0;
    const hasMaxPrice = !Number.isNaN(maxPrice) && maxPrice > 0;

    if (hasMinPrice || hasMaxPrice) {
        filter.Baseprice = {};
        if (hasMinPrice) filter.Baseprice.$gte = minPrice;
        if (hasMaxPrice) filter.Baseprice.$lte = maxPrice;
    }

    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: "i" } },
            { brand: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
        ];
    }

    return { filter, hasMinPrice, hasMaxPrice };
};

// Helper: Apply variant-based filtering (color, stock)
const applyVariantFilters = async (filter, params) => {
    const { selectedColors, stock } = params;
    if (!selectedColors.length && !stock) return filter;

    // First find products matching basic filters to narrow down variant search
    const products = await Product.find(filter).select('_id').lean();
    const productIds = products.map(p => p._id);

    const variantFilter = { productId: { $in: productIds }, status: "Active" };
    if (selectedColors.length) variantFilter.color = { $in: selectedColors };

    if (stock === 'instock') {
        variantFilter.stock = { $gt: 0 };
    } else if (stock === 'outofstock') {
        variantFilter.stock = { $lte: 0 };
    }

    const matchingVariants = await ProductVariant.find(variantFilter).select('productId').lean();
    const filteredProductIds = [...new Set(matchingVariants.map(v => v.productId.toString()))];

    filter._id = { $in: filteredProductIds };
    return filter;
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

// Helper: Enrich products with variant details
const enrichProducts = async (products) => {
    return Promise.all(
        products.map(async (product) => {
            const variant = await ProductVariant.findOne({
                productId: product._id,
                status: "Active",
            });
            return {
                ...product.toObject(),
                variant: variant ? variant.toObject() : null,
                image: (variant && variant.images && variant.images.length > 0) ? variant.images[0] : null,
                stock: variant ? variant.stock : 0,
                color: variant ? variant.color : null,
            };
        })
    );
};

// Helper: Prepare UI elements (query string, heading, filter count)
const prepareUIHelpers = (params, categories, minPriceValue, maxPriceValue) => {
    const {
        selectedCategories, selectedBrands, selectedColors, selectedTags,
        hasMinPrice, hasMaxPrice, minPrice, maxPrice, search, stock, discount, sort, limit
    } = params;

    const queryParams = new URLSearchParams();
    selectedCategories.forEach(cat => queryParams.append("category", cat));
    selectedBrands.forEach(b => queryParams.append("brand", b));
    selectedColors.forEach(c => queryParams.append("color", c));
    selectedTags.forEach(t => queryParams.append("tag", t));

    if (hasMinPrice) queryParams.append("minPrice", minPrice);
    if (hasMaxPrice) queryParams.append("maxPrice", maxPrice);
    if (search) queryParams.append("search", search);
    if (stock) queryParams.append("stock", stock);
    if (discount === 'true') queryParams.append("discount", "true");
    if (sort && sort !== "featured") queryParams.append("sort", sort);
    if (limit && limit != 12) queryParams.append("limit", limit);

    const heading = selectedCategories.length === 1
        ? categories.find(cat => cat._id.toString() === selectedCategories[0])?.categoryName || "Products"
        : "Products";

    const appliedFiltersCount =
        selectedCategories.length +
        selectedBrands.length +
        selectedColors.length +
        selectedTags.length +
        (search ? 1 : 0) +
        (stock ? 1 : 0) +
        (discount === 'true' ? 1 : 0) +
        (hasMinPrice && minPrice > minPriceValue ? 1 : 0) +
        (hasMaxPrice && maxPrice < maxPriceValue ? 1 : 0);

    return { queryString: queryParams.toString(), heading, appliedFiltersCount };
};

export async function getProducts(req, res) {
    try {
        // 1. Normalize Query Parameters
        const params = normalizeQuery(req.query);

        // 2. Build Base Filter
        const { filter, hasMinPrice, hasMaxPrice } = buildBaseFilter(params);
        params.hasMinPrice = hasMinPrice;
        params.hasMaxPrice = hasMaxPrice;

        // 3. Fetch Peripheral Data (Categories, Brands, Price Stats, Tags)
        const categories = await Category.find({ isActive: true }).lean();
        const [brandsDistinct, priceStats, tagsDistinct] = await Promise.all([
            Product.distinct("brand"),
            Product.aggregate([
                { $match: { isBlocked: { $ne: true } } },
                { $group: { _id: null, minPrice: { $min: "$Baseprice" }, maxPrice: { $max: "$Baseprice" } } },
            ]),
            Product.distinct("tags"),
        ]);

        const minPriceValue = priceStats[0]?.minPrice ?? 0;
        const maxPriceValue = priceStats[0]?.maxPrice ?? 0;

        const priceRange = {
            min: minPriceValue,
            max: maxPriceValue,
            selectedMin: hasMinPrice ? params.minPrice : minPriceValue,
            selectedMax: hasMaxPrice ? params.maxPrice : maxPriceValue,
        };

        // 4. Apply Variant-Specific Filters (Color, Stock)
        await applyVariantFilters(filter, params);

        // 5. Pagination and Sorting
        const skip = (params.page - 1) * params.limit;
        const sortOption = getSortOption(params.sort);

        const [totalProducts, products] = await Promise.all([
            Product.countDocuments(filter),
            Product.find(filter)
                .populate("categoryId")
                .populate("offerId")
                .sort(sortOption)
                .skip(skip)
                .limit(params.limit)
        ]);

        // 6. Enrichment and Additional UI Data
        const productsWithVariants = await enrichProducts(products);
        const availableColors = (await ProductVariant.distinct("color", { status: "Active" })).filter(Boolean).sort();
        const brands = brandsDistinct.filter(Boolean).sort();
        const tags = tagsDistinct.filter(Boolean).flat().filter((v, i, a) => a.indexOf(v) === i).sort();

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
        const totalPages = Math.max(1, Math.ceil(totalProducts / params.limit));

        // 8. Render
        res.render("users/productList", {
            products: productsWithVariants,
            categories,
            brands,
            colors: availableColors,
            tags,
            priceRange,
            logoUrl,
            sortOptions,
            appliedFiltersCount,
            pagination: {
                currentPage: params.page,
                totalPages,
                totalItems: totalProducts,
                itemsPerPage: params.limit,
                hasNext: params.page < totalPages,
                hasPrev: params.page > 1,
            },
            filters: {
                categories: params.selectedCategories,
                brands: params.selectedBrands,
                colors: params.selectedColors,
                tags: params.selectedTags,
                minPrice: priceRange.selectedMin,
                maxPrice: priceRange.selectedMax,
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
            tags: [],
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
                tags: [],
                minPrice: 0,
                maxPrice: 0,
                search: "",
                sort: "featured",
                stock: "",
                discount: "",
                heading: "Products",
            },
            query: "",
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

        //when product is not found
        if (!product || (product.categoryId && product.categoryId.isActive === false)) {
            return res.status(404).render("404");
        }

        const variants = await ProductVariant.find({ productId: productId, status: "Active" }).lean();

        let selectedVariant = null;
        if (variantId) {
            selectedVariant = variants.find(v => v._id.toString() === variantId);
        }
        // Default to first variant if no specific variant selected or found
        if (!selectedVariant && variants.length > 0) {
            selectedVariant = variants[0];
        }

        // Prepare display data
        const displayProduct = {
            ...product,
            price: selectedVariant ? selectedVariant.price : product.Baseprice,
            image: (selectedVariant && selectedVariant.images && selectedVariant.images.length > 0)
                ? selectedVariant.images[0]
                : "https://dummyimage.com/600x600/f3f4f6/94a3b8&text=No+Image",
            stock: selectedVariant ? selectedVariant.stock : 0,
            variant: selectedVariant,
            variants: variants
        };

        // Fetch related products 
        const relatedProducts = await Product.aggregate([
            { $match: { categoryId: product.categoryId?._id || product.categoryId, _id: { $ne: product._id } } },
            { $sample: { size: 4 } } // Random 4 related products
        ]);

        // Populate images for related products (need to fetch their variants)
        const relatedProductsWithImages = await Promise.all(relatedProducts.map(async (rp) => {
            const v = await ProductVariant.findOne({ productId: rp._id, status: "Active" });
            console.log("rp", rp);
            console.log("v", v);
            return {
                ...rp,
                image: (v && v.images && v.images.length > 0) ? v.images[0] : "https://dummyimage.com/300x300/f3f4f6/94a3b8&text=No+Image",
                price: v ? v.price : rp.Baseprice
            };
        }));

        const logoUrl = process.env.LOGO_URL || process.env.SEATWORLD_LOGO_URL || null;

        res.render("users/productDetails", {
            product: displayProduct,
            relatedProducts: relatedProductsWithImages,
            logoUrl,
            breadcrumbs: buildBreadcrumb([
                { label: "Products", url: "/products" },
                { label: displayProduct.name, url: `/product/${displayProduct._id}` }
            ])
        });

    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
}


