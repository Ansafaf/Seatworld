
import { razorpayInstance } from "../config/razorpay.js";
import { status_Codes } from "../enums/statusCodes.js";

export const createRazorpayOrder = async (req, res) => {
   if (!req.session.user) return res.redirect("/login");
  try {
    const { amount } = req.body;

    const options = {
      amount: amount * 100, 
      currency: "INR",
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);

    res.status(status_Codes.OK).json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};