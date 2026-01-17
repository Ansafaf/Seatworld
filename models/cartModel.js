import mongoose from "mongoose";

const { Schema, model, Types } = mongoose;

const cartSchema = new Schema(
  {
    userId: {
      type: Types.ObjectId,
      ref: "User",
      required: true,
    },

    variantId: {
      type: Types.ObjectId,
      ref: "ProductVariant",
      required: true,
    },

    productQuantity: {
      type: Number,
      required: true,
      min: 1,
    },

    deliveryFee: {
      type: Number,
      default: 0,
    },

    couponId: {
      type: Types.ObjectId,
      ref: "Coupon",
      default: null
    }
  },
  {
    timestamps: true, // auto adds createdAt & updatedAt
  }
);

// Prevent duplicate cart entry for same (user + variant)
cartSchema.index({ userId: 1, variantId: 1 }, { unique: true });

const Cart = model("Cart", cartSchema);

export default Cart;
