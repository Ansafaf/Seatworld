import express from "express";
import { createRazorpayOrder, verifyRazorpayPayment } from "../controller/razorpayController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const razorpayRoute = express.Router();

razorpayRoute.post("/create-order", requireAuth, createRazorpayOrder);
razorpayRoute.post("/verify-payment", requireAuth, verifyRazorpayPayment);

export default razorpayRoute;