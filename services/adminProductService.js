import { Product, ProductVariant } from '../models/productModel.js';
import { Category } from '../models/categoryModel.js';
import { cloudinary } from '../config/cloudinary.js';
import { processImage } from '../utils/imageProcessor.js';

export const getAllProducts = async (query, skip, limit) => {
    const products = await Product.find(query)
        .populate("categoryId")
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

    return await Promise.all(
        products.map(async (product) => {
            const variants = await ProductVariant.find({ productId: product._id });
            const totalStock = variants.reduce((acc, curr) => acc + curr.stock, 0);
            return {
                ...product.toObject(),
                totalStock,
                variantsCount: variants.length
            };
        })
    );
};

export const getProductsCount = async (query) => {
    return await Product.countDocuments(query);
};

export const addProductWithVariants = async (productData, variantsData, files) => {
    const product = new Product(productData);
    const savedProduct = await product.save();

    const variantsToInsert = await Promise.all(variantsData.map(async (variant, index) => {
        const imageField = `images_${variant.imageIndex !== undefined ? variant.imageIndex : index}`;
        const variantFiles = files.filter((f) => f.fieldname === imageField);

        const imageUrls = await Promise.all(variantFiles.map(async (file) => {
            const processedBuffer = await processImage(file.buffer);
            return new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    { folder: 'products', resource_type: 'image' },
                    (error, result) => {
                        if (error) reject(error);
                        else resolve(result.secure_url);
                    }
                );
                uploadStream.end(processedBuffer);
            });
        }));

        return {
            ...variant,
            productId: savedProduct._id,
            images: imageUrls,
            status: (variant.stock && variant.stock > 0) ? "Active" : "OutofStock",
        };
    }));

    if (variantsToInsert.length > 0) {
        await ProductVariant.insertMany(variantsToInsert);
    }

    return savedProduct;
};

export const updateProductWithVariants = async (id, productData, processedVariants, deletedVariantIds) => {
    await Product.findByIdAndUpdate(id, productData);

    for (const variant of processedVariants) {
        if (variant.id) {
            await ProductVariant.findByIdAndUpdate(variant.id, variant.data);
        } else {
            const newVariant = new ProductVariant(variant.data);
            await newVariant.save();
        }
    }

    if (deletedVariantIds.length > 0) {
        await ProductVariant.deleteMany({
            productId: id,
            _id: { $in: deletedVariantIds }
        });
    }
};

export const getProductById = async (id) => {
    return await Product.findById(id).populate('categoryId');
};

export const getProductWithVariants = async (id) => {
    const product = await Product.findById(id).populate('categoryId');
    if (!product) return null;
    const variants = await ProductVariant.find({ productId: id });
    return {
        ...product.toObject(),
        variants: variants.map(v => v.toObject())
    };
};

export const updateProductStatus = async (id, isBlocked) => {
    return await Product.findByIdAndUpdate(id, { isBlocked }, { new: true });
};
