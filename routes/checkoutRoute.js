import express from "express";
const checkoutRouter = express.Router();
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
    getCheckoutAddress,
    postAddress,
    getPaymentOptions,
    placeOrder,
} from "../controller/checkoutController.js";
import {getOrderSuccess} from "../controller/orderController.js";

checkoutRouter.get("/checkout", authMiddleware, getCheckoutAddress);
checkoutRouter.post("/checkout/address", authMiddleware, postAddress);
checkoutRouter.get("/checkout/payment-options", authMiddleware, getPaymentOptions);
checkoutRouter.post("/place-order", authMiddleware, placeOrder);
checkoutRouter.get("/order-success", authMiddleware, getOrderSuccess);

export default checkoutRouter;