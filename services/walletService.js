import Wallet from "../models/walletModel.js";
import Order from "../models/orderModel.js";
import OrderItem from "../models/orderItemModel.js";
import crypto from "crypto";
import logger from "../utils/logger.js";

/**
 * Calculates the refundable amount for a specific order item, accounting for order-level discounts.
 * @param {Object} order - The order object.
 * @param {Object} item - The order item object.
 * @returns {Number} The calculated refund amount.
 */
export const calculateItemRefundAmount = (order, item) => {
    if (!order || !item) return 0;

    const itemTotal = item.purchasedPrice * item.productQuantity;

    // If there's no discount, refund the full item price
    if (!order.discountAmount || order.discountAmount === 0 || !order.subtotal) {
        return itemTotal;
    }

    // Calculate the discount ratio applied to the whole order
    // Discount ratio = Discount / Items Subtotal
    const discountRatio = order.discountAmount / order.subtotal;

    // The refund should be the item total minus its proportional share of the discount
    const refundAmount = itemTotal * (1 - discountRatio);

    return Math.round(refundAmount * 100) / 100; // Round to 2 decimal places
};

/**
 * Processes a refund to the user's wallet.
 * @param {String} userId - The ID of the user.
 * @param {Number} amount - The amount to refund.
 * @param {String} description - Description for the transaction.
 * @param {String} orderId - Related Order ID.
 * @param {String} itemId - Related Order Item ID (optional).
 */
export const refundToWallet = async (userId, amount, description, orderId, itemId = null) => {
    try {
        if (amount <= 0) {
            logger.warn(`Attempted refund of zero or negative amount: ${amount} for user: ${userId}`);
            return null;
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId, balance: 0, transactions: [] });
        }

        const transactionId = `REF-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;

        wallet.balance += amount;
        wallet.transactions.push({
            walletTransactionId: transactionId,
            amount: amount,
            type: 'credit',
            description: `${description} (Order: ${orderId})`,
            date: new Date()
        });

        await wallet.save();

        if (itemId) {
            await OrderItem.findByIdAndUpdate(itemId, {
                refundStatus: 'refunded',
                refundedOn: new Date(),
                refundAmount: amount
            });
        }

        logger.info(`Refunded ₹${amount} to wallet for user: ${userId}. Transaction: ${transactionId}`);
        return transactionId;
    } catch (error) {
        logger.error(`Wallet refund failed for user ${userId}: ${error.message}`);
        throw error;
    }
};
