import { Product, ProductVariant } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";

export async function getProduct(req, res) {
    try {
        const {
            category,
            brand,
            minPrice,
            maxPrice,
            search,
            sort = "featured",
            page = 1,
            limit = 12,
        } = req.query;

        const normalize = (value) => {
            if (!value) return [];
            return Array.isArray(value)
                ? value.filter(Boolean)
                : [value].filter(Boolean);
        };

        const selectedCategories = normalize(category).filter(
            (value) => value !== "all"
        );
        const selectedBrands = normalize(brand).filter((value) => value !== "all");

        const filter = {};

        if (selectedCategories.length) {
            filter.categoryId = { $in: selectedCategories };
        }

        if (selectedBrands.length) {
            filter.brand = { $in: selectedBrands };
        }
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 
        const minPriceNum = Number(minPrice);
        const maxPriceNum = Number(maxPrice);
        const hasMinPrice = !Number.isNaN(minPriceNum);
        const hasMaxPrice = !Number.isNaN(maxPriceNum);

        if (hasMinPrice || hasMaxPrice) {
            filter.price = {};
            if (hasMinPrice) filter.price.$gte = minPriceNum;
            if (hasMaxPrice) filter.price.$lte = maxPriceNum;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: "i" } },
                { brand: { $regex: search, $options: "i" } },
                { description: { $regex: search, $options: "i" } },
            ];
        }

        const categories = await Category.find({ isActive: true }).lean();
        const [brandsDistinct, priceStats] = await Promise.all([
            Product.distinct("brand"),
            Product.aggregate([
                {
                    $group: {
                        _id: null,
                        minPrice: { $min: "$price" },
                        maxPrice: { $max: "$price" },
                    },
                },
            ]),
        ]);

        const minPriceValue = priceStats[0]?.minPrice ?? 0;
        const maxPriceValue = priceStats[0]?.maxPrice ?? 0;

        const priceRange = {
            min: minPriceValue,
            max: maxPriceValue,
            selectedMin: hasMinPrice ? minPriceNum : minPriceValue,
            selectedMax:
                hasMaxPrice && maxPriceValue !== 0 ? maxPriceNum : maxPriceValue || minPriceValue,
        };

        const numericPage = Math.max(1, parseInt(page, 10) || 1);
        const perPage = Math.max(1, parseInt(limit, 10) || 12);
        const skip = (numericPage - 1) * perPage;

        const sortMap = {
            featured: { createdAt: -1 },
            newest: { createdAt: -1 },
            "price-low": { price: 1 },
            "price-high": { price: -1 },
            name: { name: 1 },
        };

        const sortOption = sortMap[sort] || sortMap.featured;

        const totalProducts = await Product.countDocuments(filter);

        const products = await Product.find(filter)
            .populate("categoryId")
            .populate("offerId")
            .sort(sortOption)
            .skip(skip)
            .limit(perPage);

        const productsWithVariants = await Promise.all(
            products.map(async (product) => {
                const variant = await ProductVariant.findOne({
                    productId: product._id,
                    status: "Active",
                });
                return {
                    ...product.toObject(),
                    variant: variant ? variant.toObject() : null,
                    image:
                        variant && variant.images && variant.images.length > 0
                            ? variant.images[0]
                            : null,
                    stock: variant ? variant.stock : 0,
                    color: variant ? variant.color : null,
                };
            })
        );

        const brands = brandsDistinct.filter(Boolean).sort();

        const queryParams = new URLSearchParams();
        selectedCategories.forEach((cat) => queryParams.append("category", cat));
        selectedBrands.forEach((brandName) =>
            queryParams.append("brand", brandName)
        );
        if (hasMinPrice && minPriceNum !== minPriceValue) {
            queryParams.append("minPrice", minPriceNum);
        }
        if (hasMaxPrice && maxPriceNum !== maxPriceValue) {
            queryParams.append("maxPrice", maxPriceNum);
        }
        if (search) queryParams.append("search", search);
        if (sort && sort !== "featured") queryParams.append("sort", sort);
        const queryString = queryParams.toString();

        const heading =
            selectedCategories.length === 1
                ? categories.find(
                    (cat) => cat._id.toString() === selectedCategories[0]
                )?.categoryName || "Chairs"
                : "Chairs";

        const appliedFiltersCount =
            selectedCategories.length +
            selectedBrands.length +
            (search ? 1 : 0) +
            (hasMinPrice && minPriceNum > minPriceValue ? 1 : 0) +
            (hasMaxPrice && maxPriceNum < maxPriceValue ? 1 : 0);

        const sortOptions = [
            { value: "featured", label: "Featured" },
            { value: "newest", label: "Newest" },
            { value: "price-low", label: "Price: Low to High" },
            { value: "price-high", label: "Price: High to Low" },
            { value: "name", label: "Name A-Z" },
        ];

        const logoUrl =
            process.env.LOGO_URL || process.env.SEATWORLD_LOGO_URL || null;

        res.render("users/productlist", {
            products: productsWithVariants,
            categories,
            brands,
            priceRange,
            logoUrl,
            sortOptions,
            appliedFiltersCount,
            pagination: {
                currentPage: numericPage,
                totalPages: Math.max(1, Math.ceil(totalProducts / perPage)),
                totalItems: totalProducts,
                itemsPerPage: perPage,
                hasNext: numericPage < Math.ceil(totalProducts / perPage),
                hasPrev: numericPage > 1,
            },
            filters: {
                categories: selectedCategories,
                brands: selectedBrands,
                minPrice: priceRange.selectedMin,
                maxPrice: priceRange.selectedMax,
                search: search || "",
                sort: sort || "featured",
                heading,
            },
            query: queryString,
        });
    } catch (err) {
        console.error("Error fetching products:", err);

        const logoUrl =
            process.env.LOGO_URL || process.env.SEATWORLD_LOGO_URL || null;

        res.render("users/productlist", {
            error: "Failed to load products",
            products: [],
            categories: [],
            brands: [],
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
                minPrice: 0,
                maxPrice: 0,
                search: "",
                sort: "featured",
                heading: "Chairs",
            },
            query: "",
        });
    }
}

export async function getProductdetail(req, res) {
    try {
        const productId = req.params.id;
        const variantId = req.query.variant;

        const product = await Product.findById(productId).lean();
        if (!product) {
            return res.status(404).render("users/404"); // Assuming 404 page exists or handle error
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

        // Fetch related products (same category)
        const relatedProducts = await Product.aggregate([
            { $match: { categoryId: product.categoryId, _id: { $ne: product._id } } },
            { $sample: { size: 4 } } // Random 4 related products
        ]);

        // Populate images for related products (need to fetch their variants)
        const relatedProductsWithImages = await Promise.all(relatedProducts.map(async (rp) => {
            const v = await ProductVariant.findOne({ productId: rp._id, status: "Active" });
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
            logoUrl
        });

    } catch (err) {
        console.log(err);
        res.status(500).send("Internal Server Error");
    }
}

export async function getProductbyBrand(req, res) {
    try {
        const products = await Product.find({ brand: req.params.brand });
        res.render("ProductbyBrand", { products });
    } catch (err) {
        console.log(err);
        res.send("Internal Server Error");
    }
}

export function getProductbyprice(req, res) {

}

export function getProductbycategory(req, res) {

}

export function getProductbyAll(req, res) {

}