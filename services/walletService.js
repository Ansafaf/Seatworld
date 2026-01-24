import Wallet from "../models/walletModel.js";
import Order from "../models/orderModel.js";
import OrderItem from "../models/orderItemModel.js";
import crypto from "crypto";
import logger from "../utils/logger.js";


export const calculateItemRefundAmount = (order, item) => {
    if (!order || !item) return 0;

    const itemTotal = item.purchasedPrice * item.productQuantity;

    // If there's no discount, refund the full item price
    if (!order.discountAmount || order.discountAmount === 0 || !order.subtotal) {
        return itemTotal;
    }
    
    const discountRatio = order.discountAmount / order.subtotal;
    
    const refundAmount = itemTotal * (1 - discountRatio);

    return Math.round(refundAmount * 100) / 100; // Round to 2 decimal places
};

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

        const shortOrderId = orderId.toString().slice(-6).toUpperCase();
        wallet.balance += amount;
        wallet.transactions.push({
            walletTransactionId: transactionId,
            amount: amount,
            type: 'credit',
            description: `${description} (#Order ${shortOrderId})`,
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
