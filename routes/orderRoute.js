import express from "express";
const orderRouter = express.Router();
import { requireAuth } from "../middleware/authMiddleware.js";
import { getOrderSuccess, getOrderFailed, placeOrder, getorders, getOrderDetails, handleItemAction, downloadInvoice } from "../controller/orderController.js";


orderRouter.post("/place-order", requireAuth, placeOrder);
orderRouter.get("/order-success", requireAuth, getOrderSuccess);
orderRouter.get("/order-failed", requireAuth, getOrderFailed);
orderRouter.get("/orders", requireAuth, getorders);
orderRouter.get("/orders/:orderId", requireAuth, getOrderDetails);
orderRouter.patch("/orders/:orderId/items/:itemId/request", requireAuth, handleItemAction);

orderRouter.get("/orders/:orderId/invoice", requireAuth, downloadInvoice);

export default orderRouter;