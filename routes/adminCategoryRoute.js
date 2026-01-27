import express from 'express';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware.js';
const adminRouter = express.Router();
import {
    getCategoryList,
    getAddCategory,
    postAddCategory,
    getEditCategory,
    postEditCategory,
    postBlockCategory,
    postUnblockCategory
} from "../controller/adminCategory.js";

adminRouter.get("/categories", adminAuthMiddleware, getCategoryList);
adminRouter.get("/add-category", adminAuthMiddleware, getAddCategory);
adminRouter.post("/add-category", adminAuthMiddleware, postAddCategory);
adminRouter.get("/edit-category/:categoryId", adminAuthMiddleware, getEditCategory);
adminRouter.post("/edit-category/:categoryId", adminAuthMiddleware, postEditCategory);
adminRouter.post("/block-category/:categoryId", adminAuthMiddleware, postBlockCategory);
adminRouter.post("/unblock-category/:categoryId", adminAuthMiddleware, postUnblockCategory);

// adminRouter.patch("/")

export default adminRouter;