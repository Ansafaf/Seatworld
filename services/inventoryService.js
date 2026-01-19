import { ProductVariant } from "../models/productModel.js";
import StockHistory from "../models/stockHistoryModel.js";
import logger from "../utils/logger.js";
import mongoose from "mongoose";

export const updateStock = async ({ variantId, quantity, reason, orderId = null, adminId = null, notes = "", session = null }) => {
    try {
        // Use findOneAndUpdate with $inc for true atomic operation at the DB level
        // and add a condition to prevent stock from going below zero
        const updateQuery = { _id: variantId };
        if (quantity < 0) {
            updateQuery.stock = { $gte: Math.abs(quantity) };
        }

        const variant = await ProductVariant.findOneAndUpdate(
            updateQuery,
            { $inc: { stock: quantity } },
            { new: true, session }
        );

        if (!variant) {
            const checkVariant = await ProductVariant.findById(variantId).session(session);
            if (!checkVariant) throw new Error("Product variant not found");
            throw new Error(`Insufficient stock for variant ${variantId}. Current stock: ${checkVariant.stock}`);
        }

        // Auto-manage status based on updated stock
        if (variant.stock === 0) {
            variant.status = "OutofStock";
        } else if (variant.stock > 0 && variant.status === "OutofStock") {
            variant.status = "Active";
        }
        await variant.save({ session });

        const previousStock = variant.stock - quantity;
        const newStock = variant.stock;

        // Log to history
        const historyAction = quantity > 0 ? "increment" : "decrement";
        const historyEntry = new StockHistory({
            variantId,
            changeType: historyAction,
            quantity: Math.abs(quantity),
            previousStock,
            currentStock: newStock,
            reason,
            orderId,
            adminId,
            notes
        });

        await historyEntry.save({ session });

        logger.info(`Stock ${historyAction}d for variant ${variantId}: ${quantity}. New stock: ${newStock}. Reason: ${reason}`);

        return { success: true, currentStock: newStock };
    } catch (error) {
        logger.error(`Stock update failed for variant ${variantId}: ${error.message}`);
        throw error;
    }
};


export const checkStockAvailability = async (items) => {
    for (const item of items) {
        const variant = await ProductVariant.findById(item.variantId);
        if (!variant || variant.stock < item.quantity) {
            return {
                available: false,
                item: item.productId?.name || item.name || "A product",
                availableStock: variant ? variant.stock : 0
            };
        }
    }
    return { available: true };
};

/**
 * Get stock status based on threshold
 */
export const getStockStatus = (stock, threshold = 5) => {
    if (stock <= 0) return { label: "Out of Stock", color: "red", code: "out_of_stock" };
    if (stock <= threshold) return { label: "Low Stock", color: "orange", code: "low_stock" };
    return { label: "In Stock", color: "green", code: "in_stock" };
};
