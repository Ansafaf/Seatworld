import { Product, ProductVariant } from '../models/productModel.js';
import { Category } from '../models/categoryModel.js';

export const productList = async(req,res)=> {
  try{
    const products = await Product.find();
    res.render("admin/productList",{products});
  }
  catch(error){
    console.log(error);
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
    } = req.body;

    const product = new Product({
      name: productName,
      brand: brandName,
      Baseprice: Baseprice,       
      description: description,
      categoryId: category,
      tags: [],
    });

    const savedProduct = await product.save();

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


export const getAddProduct = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).select("_id categoryName");
    res.render("admin/addproduct", { categories });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong!");
  }
}

