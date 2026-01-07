import express from "express";
const checkoutRouter = express.Router();
import { authMiddleware } from "../middleware/authMiddleware.js";
import {
    getCheckoutAddress,
    postAddress,
    getPaymentOptions,
    applyCoupon,
    removeCoupon
} from "../controller/checkoutController.js";


checkoutRouter.get("/checkout", authMiddleware, getCheckoutAddress);
checkoutRouter.post("/checkout/address", authMiddleware, postAddress);
checkoutRouter.get("/checkout/payment-options", authMiddleware, getPaymentOptions);
checkoutRouter.post("/checkout/apply-coupon", authMiddleware, applyCoupon);
checkoutRouter.post("/checkout/remove-coupon", authMiddleware, removeCoupon);

export default checkoutRouter;