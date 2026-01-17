import express from "express";
const checkoutRouter = express.Router();
import { requireAuth } from "../middleware/authMiddleware.js";
import {
    getCheckoutAddress,
    postAddress,
    getPaymentOptions,
    applyCoupon,
    removeCoupon
} from "../controller/checkoutController.js";

checkoutRouter.get("/checkout", requireAuth, getCheckoutAddress);
checkoutRouter.post("/checkout/address", requireAuth, postAddress);
checkoutRouter.get("/checkout/payment-options", requireAuth, getPaymentOptions);
checkoutRouter.post("/checkout/apply-coupon", requireAuth, applyCoupon);
checkoutRouter.post("/checkout/remove-coupon", requireAuth, removeCoupon);

export default checkoutRouter;