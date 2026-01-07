import mongoose from "mongoose";

const orderItemSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true
    },

    productName: {
      type: String,
      required: true
    },

    productImage: {
      type: String,
      required: true
    },

    variantLabel: {
      type: String,
      default: null
    },

    productQuantity: {
      type: Number,
      required: true
    },

    purchasedPrice: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: [
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "cancel_requested",
        "cancelled",
        "return_requested",
        "returned"
      ],
      default: "pending"
    },

    returnReason: {
      type: String,
      default: null
    },

    returnComment: {
      type: String,
      default: null
    },

    cancelReason: {
      type: String,
      default: null
    },

    cancelledOn: {
      type: Date,
      default: null
    },

    shippedOn: {
      type: Date,
      default: null
    },

    deliveredOn: {
      type: Date,
      default: null
    },

    returnRequestedOn: {
      type: Date,
      default: null
    },

    returnedOn: {
      type: Date,
      default: null
    },

    rejectedOn: {
      type: Date,
      default: null
    },

    deliveryExpected: {
      type: Date,
      default: null
    },

    pickupScheduled: {
      type: Boolean,
      default: false
    },

    pickupDate: {
      type: Date,
      default: null
    },

    refundStatus: {
      type: String,
      enum: ["not_initiated", "initiated", "in_progress", "refunded"],
      default: "not_initiated"
    },

    refundedOn: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

const OrderItem = mongoose.model("OrderItem", orderItemSchema);
export default OrderItem;
