import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },

    couponId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Coupon",
      default: null
    },

    totalAmount: {
      type: Number,
      required: true
    },

    subtotal: {
      type: Number,
      default: 0
    },

    discountAmount: {
      type: Number,
      default: 0
    },

    shippingFee: {
      type: Number,
      default: 0
    },

    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending"
    },

    paymentMethod: {
      type: String,
      required: true
    },

    shippingAddress: {
      name: { type: String, required: true },
      housename: { type: String, required: true },
      street: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      country: { type: String, required: true },
      pincode: { type: String, required: true },
      mobile: { type: String, required: true }
    }
  },
  {
    timestamps: true
  }
);

const Order = mongoose.model("Order", orderSchema);
export default Order;
