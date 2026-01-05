import express from "express";
const checkoutRouter = express.Router();
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
    getCheckoutAddress,
    postAddress,
    getPaymentOptions,
    placeOrder,
} from "../controller/checkoutController.js";
import {getOrderSuccess} from "../controller/adminOrderController.js";

checkoutRouter.get("/", authMiddleware, getCheckoutAddress);
checkoutRouter.post("/address", authMiddleware, postAddress);
checkoutRouter.get("/payment-options", authMiddleware, getPaymentOptions);
checkoutRouter.post("/place-order", authMiddleware, placeOrder);
checkoutRouter.get("/order-success", authMiddleware, getOrderSuccess);

export default checkoutRouter;