import express from "express";
import * as adminInventoryController from "../controller/adminInventoryController.js";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";

const router = express.Router();

router.get("/", adminAuthMiddleware, adminInventoryController.getInventoryList);
router.post("/update", adminAuthMiddleware, adminInventoryController.updateStockManually);
router.get("/history/:variantId", adminAuthMiddleware, adminInventoryController.getStockHistory);

export default router;
