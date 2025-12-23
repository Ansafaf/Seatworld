import { Product, ProductVariant } from '../models/productModel.js';
import { Category } from '../models/categoryModel.js';

export const productList = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 7;
    const skip = (page - 1) * limit;
    const searchQuery = req.query.search || "";

    const query = {};
    if (searchQuery) {
      query.name = { $regex: searchQuery, $options: "i" };
    }

    const totalProducts = await Product.countDocuments(query);
    const totalPages = Math.ceil(totalProducts / limit);

    const products = await Product.find(query)
      .populate("categoryId")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Fetch stock for each product from variants
    const productsWithStock = await Promise.all(
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

    res.render("admin/adminProductlist", {
      products: productsWithStock,
      currentPage: page,
      totalPages,
      search: searchQuery,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong!");
  }
};

export const getAddProduct = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).select("_id categoryName");
    res.render("admin/addproduct", { categories });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong!");
  }
}


export const postAddProduct = async (req, res) => {
  try {
    const {
      productName,
      Baseprice,
      category,
      brandName,
      description,
      color,
      variantPrice,
      variantStock,
      images
    } = req.body;

    const product = new Product({
      name: productName,
      brand: brandName,
      Baseprice: Baseprice,
      description: description,
      categoryId: category,
      tags: [],
      images: images
    });


    const savedProduct = await Product.insertOne(product);

    // 2️⃣ Build variants array
    // Express sends a single string if there's only one item,
    // so make sure they are arrays:
    const colors = Array.isArray(color) ? color : [color];
    const prices = Array.isArray(variantPrice) ? variantPrice : [variantPrice];
    const stocks = Array.isArray(variantStock) ? variantStock : [variantStock];

    const files = req.files || []; // multer files (Cloudinary URLs in file.path)

    const variantsToInsert = colors.map((c, index) => {
      const imageField = `images_${index}`;

      const imageUrls = files
        .filter((f) => f.fieldname === imageField)
        .map((f) => f.path); // Cloudinary URL

      return {
        productId: savedProduct._id,
        color: c,
        stock: stocks[index] || 0,
        price: prices[index] || Baseprice,
        images: imageUrls,
        status: (stocks[index] && stocks[index] > 0) ? "Active" : "OutofStock",
      };
    });

    // 3️⃣ Save all variants
    if (variantsToInsert.length > 0) {
      await ProductVariant.insertMany(variantsToInsert);
    }

    res.redirect("/admin/products");
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong!");
  }
};

export const editProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    const variants = await ProductVariant.find({ productId: id });
    const categories = await Category.find({ isActive: true });
    res.render("admin/editProduct", { product, variants, categories });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong!");
  }
};

export const postEditProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      productName,
      Baseprice,
      category,
      brandName,
      description,
      variantId,
      color,
      variantPrice,
      variantStock,
    } = req.body;

    // 1. Update Product Details
    await Product.findByIdAndUpdate(id, {
      name: productName,
      brand: brandName,
      Baseprice: Baseprice,
      description: description,
      categoryId: category,
    });

    // 2. Handle Variants
    // Normalize to arrays (in case of single variant)
    const variantIds = Array.isArray(variantId) ? variantId : (variantId ? [variantId] : []);
    const variantIndices = Array.isArray(req.body.variantIndices) ? req.body.variantIndices : (req.body.variantIndices ? [req.body.variantIndices] : []);
    const colors = Array.isArray(color) ? color : [color];
    const prices = Array.isArray(variantPrice) ? variantPrice : [variantPrice];
    const stocks = Array.isArray(variantStock) ? variantStock : [variantStock];

    const files = req.files || [];
    const processedVariantIds = [];

    // Loop through submitted variants
    for (let i = 0; i < colors.length; i++) {
      const currentVariantId = variantIds[i];
      const currentIndex = variantIndices[i]; // Get the index used for this variant's files/images
      const currentColor = colors[i];
      const currentPrice = prices[i];
      const currentStock = stocks[i];

      // Get existing images from hidden input using the correct index
      const existingImagesJson = req.body[`existingImages_${currentIndex}`];
      let finalImages = [];
      if (existingImagesJson) {
        try {
          finalImages = JSON.parse(existingImagesJson);
        } catch (e) {
          console.error("Error parsing existing images", e);
        }
      }

      // Get new uploaded images for this variant index
      const imageField = `images_${currentIndex}`;
      const newImages = files
        .filter((f) => f.fieldname === imageField)
        .map((f) => f.path); // Cloudinary URL

      finalImages = [...finalImages, ...newImages];

      const variantData = {
        productId: id,
        color: currentColor,
        price: currentPrice,
        stock: currentStock,
        images: finalImages,
        status: (currentStock && currentStock > 0) ? "Active" : "OutofStock",
      };

      if (currentVariantId) {
        // Update existing variant
        await ProductVariant.findByIdAndUpdate(currentVariantId, variantData);
        processedVariantIds.push(currentVariantId);
      } else {
        // Create new variant
        const newVariant = new ProductVariant(variantData);
        const savedVariant = await newVariant.save();
        processedVariantIds.push(savedVariant._id);
      }
    }

    // 3. Delete Removed Variants
    // Find all variants for this product that were NOT in the processed list
    await ProductVariant.deleteMany({
      productId: id,
      _id: { $nin: processedVariantIds }
    });

    res.redirect("/admin/products");
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong!");
  }
};

export const blockProduct = async (req, res) => {
  try {
    const { id } = req.params;
     if(ProductVariant.status == "Blocked"){
      return res.status(200).json({message:"Product already blocked"});
    }
   
    await ProductVariant.findByIdAndUpdate(id,{status:"Blocked"});

    res.status(200).json({ message: "Product blocked successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Something went wrong!" });
  }
};

export const unblockProduct = async (req,res) =>{
  try{
     const {id} = req.params;
    if(ProductVariant.status == "Active"){
      return res.status(200).json({message:"Product already unblocked/active"})
    }
     await ProductVariant.findByIdAndUpdate({productId: id}, {status:"Active"});

     res.status(200).json({message:"Product unblocked successfully"});
  }catch(err){
    console.log(err);
    res.status(500).json({message:"Something went wrong"});
  }
}

