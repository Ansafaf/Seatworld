import express from "express";
import { createRazorpayOrder, verifyRazorpayPayment } from "../controller/razorpayController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

const razorpayRoute = express.Router();

razorpayRoute.post("/create-order", authMiddleware, createRazorpayOrder);
razorpayRoute.post("/verify-payment", authMiddleware, verifyRazorpayPayment);

export default razorpayRoute;