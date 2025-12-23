import express from "express";
import { upload } from "../config/cloudinary.js";
import { postAddProduct, getAddProduct, editProduct, postEditProduct, blockProduct } from "../controller/AdminproductController.js";
import { productList } from "../controller/AdminproductController.js";
const adminRouter = express.Router();


adminRouter.get("/products", productList);
adminRouter.get("/add-product", getAddProduct);
adminRouter.post("/add-product", upload.any(), postAddProduct);
adminRouter.get("/edit-product/:id", editProduct);
adminRouter.post("/edit-product/:id", upload.any(), postEditProduct);
adminRouter.patch("/block-product/:id", blockProduct);

export default adminRouter;
