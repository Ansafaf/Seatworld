import express from "express";
import { upload } from "../config/cloudinary.js";
import { postAddProduct, getAddProduct } from "../controller/AdminproductController.js";
import { productList } from "../controller/AdminproductController.js";

const adminRouter = express.Router();
adminRouter.get("/add-product", getAddProduct);
adminRouter.post("/add-product", upload.array("images", 3), postAddProduct);
adminRouter.get("/products", productList);

export default adminRouter;
   