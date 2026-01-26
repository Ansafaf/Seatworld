import { razorpayInstance } from "../config/razorpayConfig.js";
import crypto from "crypto";
import logger from "../utils/logger.js";
import * as cartService from "../services/cartService.js";
import * as inventoryService from "../services/inventoryService.js";
import { status_Codes } from "../enums/statusCodes.js";

export const createRazorpayOrder = async (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    try {
        const userId = req.session.user.id;
        const cartTotals = await cartService.calculateCartTotals(userId);

        if (!cartTotals.items || cartTotals.items.length === 0) {
            return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: "Cart is empty" });
        }

        const stockCheck = await inventoryService.checkStockAvailability(cartTotals.items);
        if (!stockCheck.available) {
            return res.status(status_Codes.BAD_REQUEST).json({
                success: false,
                message: `Insufficient stock for ${stockCheck.item}. Only ${stockCheck.availableStock} left.`
            });
        }

        const amount = Math.round(cartTotals.total * 100); // Amount in paise

        const options = {
            amount: amount,
            currency: "INR",
            receipt: `receipt_order_${Date.now()}`,
        };

        const razorpayOrder = await razorpayInstance.orders.create(options);

        res.json({
            success: true,
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key_id: process.env.RAZORPAY_KEY_ID,
            user: {
                name: req.session.user.name,
                email: req.session.user.email,
                mobile: req.session.user.mobile
            }
        });
    } catch (error) {
        logger.error("Razorpay Create Order Error:", error);
        res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to create Razorpay order" });
    }
};

export const verifyRazorpayPayment = async (req, res) => {
    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
        } = req.body;

        const body = razorpay_order_id + "|" + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
            .update(body.toString())
            .digest("hex");

        if (expectedSignature === razorpay_signature) {
            res.json({ success: true, message: "Payment verified" });
        } else {
            res.status(status_Codes.BAD_REQUEST).json({ success: false, message: "Invalid payment signature" });
        }
    } catch (error) {
        logger.error("Razorpay Verify Payment Error:", error);
        res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Payment verification failed" });
    }
};
