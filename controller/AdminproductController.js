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
    const { productName, price, category, brandName, stock, color, description } = req.body;
    const imageUrls = req.files.map(file => file.path); // Cloudinary returns the URL in path
     
    console.log("Uploaded Images:", imageUrls);

    // Step 1: Create the main Product
    const product = new Product({
      name: productName,
      brand: brandName,
      price: price,
      description: description,
      categoryId: category, 
      tags: [] 
    });
    
    const savedProduct = await product.save();

    // Step 2: Create the Product Variant with color, stock, and images
    const productVariant = new ProductVariant({
      productId: savedProduct._id, 
      color: color,
      stock: stock,
      price: price,  // Variant can have same or different price
      images: imageUrls,
      status: stock > 0 ? "Active" : "OutofStock" 
    });
    
    await productVariant.save();

    res.redirect("/admin/products"); // redirect to your product list page
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong!");
  }
};

export const getAddProduct = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).select("categoryName");
    res.render("admin/addproduct", { categories });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong!");
  }
}

