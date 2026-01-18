import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
  {
    couponName: {
      type: String,
      trim: true,
      required: true
    },

    couponCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true
    },

    discountValue: {
      type: Number,
      required: true,
      min: 0
    },

    discountType: {
      type: String,
      enum: ["flat", "percentage"],
      required: true
    },

    couponStatus: {
      type: String,
      enum: ["active", "blocked", "expired"],
      default: "active"
    },

    startDate: {
      type: Date,
      required: true
    },

    minAmount: {
      type: Number,
      required: true,
      min: 0
    },

    maxAmount: {
      type: Number,
      min: 0
    },

    expiryDate: {
      type: Date,
      required: true
    }
  },
  {
    timestamps: true // creates createdAt & updatedAt automatically
  }
);

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;
