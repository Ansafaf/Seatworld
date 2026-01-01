import express from "express";
import { upload } from "../config/cloudinary.js";
import { productList, postAddProduct, getAddProduct, editProduct, postEditProduct, blockProduct, unblockProduct } from "../controller/adminProductController.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import logger from "../utils/logger.js";

const adminRouter = express.Router();

const debugMulter = (req, res, next) => {
    logger.info("[adminProductRoutes] Entering Multer middleware");
    upload.any()(req, res, (err) => {
        if (err) {
            logger.error(`[adminProductRoutes] Multer error: ${err.message}`);
            return next(err);
        }
        logger.info("[adminProductRoutes] Exiting Multer middleware");
        next();
    });
};

adminRouter.get("/products", adminAuthMiddleware, productList);
adminRouter.get("/add-product", adminAuthMiddleware, getAddProduct);
adminRouter.post("/add-product", adminAuthMiddleware, upload.any(), postAddProduct);
adminRouter.get("/edit-product/:id", adminAuthMiddleware, editProduct);
adminRouter.post("/edit-product/:id", adminAuthMiddleware, debugMulter, postEditProduct);
adminRouter.patch("/block-product/:id", adminAuthMiddleware, blockProduct);
adminRouter.patch("/unblock-product/:id", adminAuthMiddleware, unblockProduct);

export default adminRouter;
