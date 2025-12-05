import express from 'express';
const adminRouter = express.Router();
import { getCategoryList, getAddCategory, postAddCategory, getEditCategory, postEditCategory} from "../controller/adminCategory.js";

adminRouter.get("/categories", getCategoryList);
adminRouter.get("/add-category",getAddCategory);
adminRouter.post("/add-category", postAddCategory);
adminRouter.get("/edit-category/:id", getEditCategory);
adminRouter.post("/edit-category/:id", postEditCategory);

// adminRouter.patch("/")

export default adminRouter;