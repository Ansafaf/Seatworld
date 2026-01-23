import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    brand: {
        type: String,
        required: true,
    },
    Baseprice: {
        type: Number,
        required: true
    },
    description: {
        type: String,
        required: false
    },
    offerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Offer"
    },
    categoryId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    isBlocked: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

export const Product = mongoose.model("Product", productSchema);


const productVariantSchema = new mongoose.Schema({
    productId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true
    },
    color: {
        type: String,
        required: true
    },
    stock: {
        type: Number,
        default: 0,
        min: 0
    },
    lowStockThreshold: {
        type: Number,
        default: 5
    },
    price: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ["Active", "OutofStock", "Blocked"],
        default: "Active"
    },
    images: {
        type: [String],
        default: []
    }
}, { timestamps: true });

productVariantSchema.index({ productId: 1 });

export const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);