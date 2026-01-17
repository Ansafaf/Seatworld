import express from "express";
const adminRouter = express.Router();
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { getOrderlist, getOrderDetails, updateOrderStatus, updateItemStatus, approveItemAction } from "../controller/adminOrderController.js";

adminRouter.get("/", adminAuthMiddleware, getOrderlist);
adminRouter.get("/:id", adminAuthMiddleware, getOrderDetails);
adminRouter.patch("/update-status", adminAuthMiddleware, updateOrderStatus);
adminRouter.patch("/items/:itemId/status", adminAuthMiddleware, updateItemStatus);
adminRouter.patch("/items/:itemId/approve", adminAuthMiddleware, approveItemAction);
adminRouter.post("/update-item-status", adminAuthMiddleware, updateItemStatus); // Legacy

export default adminRouter;