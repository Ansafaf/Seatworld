import express from "express";
const orderRouter = express.Router();
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getOrderSuccess, placeOrder, getorders, getOrderDetails, handleItemAction, downloadInvoice } from "../controller/orderController.js";


orderRouter.post("/place-order", authMiddleware, placeOrder);
orderRouter.get("/order-success", authMiddleware, getOrderSuccess);
orderRouter.get("/orders", authMiddleware, getorders);
orderRouter.get("/orders/:orderId", authMiddleware, getOrderDetails);
orderRouter.patch("/orders/:orderId/items/:itemId/request", authMiddleware, handleItemAction);

orderRouter.get("/orders/:orderId/invoice", authMiddleware, downloadInvoice);

export default orderRouter;