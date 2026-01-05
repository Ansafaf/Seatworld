import * as productService from '../services/adminProductService.js';
import * as categoryService from '../services/adminCategoryService.js';
import logger from '../utils/logger.js';
import { Product, ProductVariant } from '../models/productModel.js';
import { paginate } from '../utils/paginationHelper.js';

export const productList = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;
    const searchQuery = req.query.search || "";

    const query = {};
    if (searchQuery) {
      query.name = { $regex: searchQuery, $options: "i" };
    }

    const { items: rawProducts, pagination } = await paginate(Product, query, {
      page,
      limit,
      sort: { createdAt: -1 },
      populate: ['categoryId']
    });

    // Aggregate totalStock for each product from its variants
    const products = await Promise.all(rawProducts.map(async (p) => {
      const variants = await ProductVariant.find({ productId: p._id });
      const totalStock = variants.reduce((acc, curr) => acc + curr.stock, 0);
      return {
        ...p.toObject(),
        totalStock
      };
    }));

    // AJAX Support
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(200).json({
        success: true,
        products,
        pagination,
        search: searchQuery
      });
    }

    res.render("admin/adminProductList", {
      products,
      pagination,
      search: searchQuery,
      currentPage: pagination.currentPage,
      limit: pagination.limit
    });
  } catch (error) {
    next(error);
  }
};

export const getAddProduct = async (req, res, next) => {
  try {
    const categories = await categoryService.getActiveCategories();
    res.render("admin/addProduct", { categories });
  } catch (error) {
    next(error);
  }
}

export const postAddProduct = async (req, res, next) => {
  try {
    const productName = req.body.productName;
    const Baseprice = req.body.Baseprice;
    const category = req.body.category;
    const brandName = req.body.brandName;
    const description = req.body.description;

    // Normalize variant fields
    const color = req.body.color || req.body['color[]'];
    const variantPrice = req.body.variantPrice || req.body['variantPrice[]'];
    const variantStock = req.body.variantStock || req.body['variantStock[]'];

    const existingProduct = await Product.findOne({
      name: { $regex: new RegExp(`^${productName}$`, 'i') }
    });

    if (existingProduct) {
      return res.status(400).json({ success: false, message: 'Product with this name already exists' });
    }

    const productData = {
      name: productName,
      brand: brandName,
      Baseprice: Baseprice,
      description: description,
      categoryId: category,
    };

    const colors = Array.isArray(color) ? color : (color ? [color] : []);
    const prices = Array.isArray(variantPrice) ? variantPrice : (variantPrice ? [variantPrice] : []);
    const stocks = Array.isArray(variantStock) ? variantStock : (variantStock ? [variantStock] : []);
    let vIndices = req.body.variantIndices || req.body['variantIndices[]'];
    const variantIndices = Array.isArray(vIndices) ? vIndices : (vIndices ? [vIndices] : []);

    const variantsData = colors.map((c, index) => ({
      color: c,
      stock: stocks[index] || 0,
      price: prices[index] || Baseprice,
      imageIndex: variantIndices[index]
    }));

    await productService.addProductWithVariants(productData, variantsData, req.files || []);

    res.status(200).json({ success: true, message: 'Product added Successfully', redirectUrl: "/admin/products" });
  } catch (error) {
    next(error);
  }
};

export const editProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { ProductVariant } = await import('../models/productModel.js');
    const product = await Product.findById(id);
    const variants = await ProductVariant.find({ productId: id });
    const categories = await categoryService.getActiveCategories();
    res.render("admin/editProduct", { product, variants, categories });
  } catch (error) {
    next(error);
  }
};

export const postEditProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    logger.info(`[postEditProduct] Request received for Product ID: ${id}`);

    // Log body keys to debug data
    logger.info(`[postEditProduct] Body keys: ${Object.keys(req.body).join(', ')}`);
    const productName = req.body.productName;
    const Baseprice = req.body.Baseprice;
    const category = req.body.category;
    const brandName = req.body.brandName;
    const description = req.body.description;

    // Normalize variant fields
    const color = req.body.color || req.body['color[]'];
    const variantPrice = req.body.variantPrice || req.body['variantPrice[]'];
    const variantStock = req.body.variantStock || req.body['variantStock[]'];
    const variantId = req.body.variantId || req.body['variantId[]'];

    const productData = {
      name: productName,
      brand: brandName,
      Baseprice: Baseprice,
      description: description,
      categoryId: category,
    };

    const variantIds = Array.isArray(variantId) ? variantId : (variantId ? [variantId] : []);
    const colors = color ? (Array.isArray(color) ? color : [color]) : [];
    const prices = variantPrice ? (Array.isArray(variantPrice) ? variantPrice : [variantPrice]) : [];
    const stocks = variantStock ? (Array.isArray(variantStock) ? variantStock : [variantStock]) : [];

    // Normalized variant indices
    let vIndices = req.body.variantIndices || req.body['variantIndices[]'];
    const variantIndices = Array.isArray(vIndices) ? vIndices : (vIndices ? [vIndices] : []);

    logger.info(`[postEditProduct] Colors count: ${colors.length}, VariantIndices count: ${variantIndices.length}`);

    const files = req.files || [];
    const processedVariants = [];

    const { processImage } = await import('../utils/imageProcessor.js');
    const { cloudinary } = await import('../config/cloudinary.js');

    for (let i = 0; i < colors.length; i++) {
      logger.info(`[postEditProduct] Processing variant index ${i}`);

      const currentVariantId = variantIds[i];
      const currentIndex = variantIndices[i];
      if (typeof currentIndex === 'undefined') {
        logger.error(`[postEditProduct] currentIndex is undefined for i=${i}`);
        throw new Error(`Missing variant index for variant ${i}`);
      }

      const existingImagesJson = req.body[`existingImages_${currentIndex}`];
      let finalImages = existingImagesJson ? JSON.parse(existingImagesJson) : [];

      const imageField = `images_${currentIndex}`;
      const vFiles = files.filter((f) => f.fieldname === imageField);

      logger.info(`[postEditProduct] Variant ${i}: Existing images: ${finalImages.length}, New files: ${vFiles.length}`);

      if (vFiles.length > 0) {
        const newImages = await Promise.all(vFiles.map(async (file) => {
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
        finalImages = [...finalImages, ...newImages];
      }

      processedVariants.push({
        id: currentVariantId,
        data: {
          productId: id,
          color: colors[i],
          price: prices[i],
          stock: stocks[i],
          images: finalImages,
          status: (stocks[i] > 0) ? "Active" : "OutofStock",
        }
      });
    }

    const processedVariantIds = processedVariants.map(v => v.id).filter(id => id);
    const { ProductVariant } = await import('../models/productModel.js');
    const allCurrentVariants = await ProductVariant.find({ productId: id });
    const deletedVariantIds = allCurrentVariants
      .filter(v => !processedVariantIds.includes(v._id.toString()))
      .map(v => v._id);

    logger.info(`[postEditProduct] Updating database. Deleted variants: ${deletedVariantIds.length}`);

    await productService.updateProductWithVariants(id, productData, processedVariants, deletedVariantIds);

    logger.info(`[postEditProduct] Success.`);
    res.status(200).json({ success: true, message: 'Product updated Successfully', redirectUrl: "/admin/products" });
  } catch (error) {
    logger.error(`[postEditProduct] Error: ${error.message}`);
    next(error);
  }
};

export const blockProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await productService.updateProductStatus(id, true);
    res.status(200).json({ message: `Product "${product.name}" blocked successfully`, productName: product.name });
  } catch (error) {
    next(error);
  }
};

export const unblockProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id);
    if (!product) return res.status(404).json({ message: "Product not found" });

    await productService.updateProductStatus(id, false);
    res.status(200).json({ message: `Product "${product.name}" unblocked successfully`, productName: product.name });
  } catch (error) {
    next(error);
  }
};

