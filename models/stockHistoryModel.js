import mongoose from "mongoose";

const stockHistorySchema = new mongoose.Schema({
    variantId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "ProductVariant",
        required: true
    },
    changeType: {
        type: String,
        enum: ["increment", "decrement", "set"],
        required: true
    },
    quantity: {
        type: Number,
        required: true
    },
    previousStock: {
        type: Number,
        required: true
    },
    currentStock: {
        type: Number,
        required: true
    },
    reason: {
        type: String,
        required: true,
        enum: [
            "order_placed",
            "order_cancelled",
            "order_returned",
            "manual_adjustment",
            "restock",
            "damage",
            "admin_edit"
        ]
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Order",
        default: null
    },
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Admin",
        default: null
    },
    notes: {
        type: String,
        default: ""
    }
}, { timestamps: true });

const StockHistory = mongoose.model("StockHistory", stockHistorySchema);
export default StockHistory;
