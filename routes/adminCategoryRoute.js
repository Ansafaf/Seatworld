import express from 'express';
const adminRouter = express.Router();
import { getCategoryList, getAddCategory, postAddCategory, getEditCategory, postEditCategory} from "../controller/adminCategory.js";

adminRouter.get("/categories", getCategoryList);
adminRouter.get("/add-cateory",getAddCategory);
adminRouter.post("/add-categoey", postAddCategory);
adminRouter.get("/edit-category/:id", getEditCategory);
adminRouter.post("/edit-category/:id", postEditCategory);

export default adminRouter;