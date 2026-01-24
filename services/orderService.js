import Order from "../models/orderModel.js";
import OrderItem from "../models/orderItemModel.js";
import Cart from "../models/cartModel.js";
import { Product, ProductVariant } from "../models/productModel.js";
import Wallet from "../models/walletModel.js";
import * as inventoryService from "./inventoryService.js";
import logger from "../utils/logger.js";
import crypto from "crypto";
import * as walletService from "./walletService.js";
import { calculateDerivedStatus } from "../utils/orderStatusHelper.js";
import * as offerHelper from "../utils/offerHelper.js";

export const getUserOrders = async (userId, page = 1, limit = 8, search = "") => {
    const skip = (page - 1) * limit;

    let query = { userId };

    const [totalOrders, orders] = await Promise.all([
        Order.countDocuments(query),
        Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
    ]);

    const ordersWithItems = await Promise.all(orders.map(async (order) => {
        const items = await OrderItem.find({ orderId: order._id })
            .populate({
                path: 'variantId',
                populate: { path: 'productId' }
            })
            .lean();

        return {
            ...order.toObject(),
            subtotal: order.subtotal || items.reduce((sum, item) => sum + (item.purchasedPrice * item.productQuantity), 0),
            items: items.map(item => ({
                ...item,
                name: item.productName || item.variantId?.productId?.name || 'Unknown',
                image: item.productImage || item.variantId?.images?.[0] || '',
                label: item.variantLabel || item.variantId?.color || '',
                total: item.purchasedPrice * item.productQuantity,
                finalAmount: walletService.calculateItemRefundAmount(order, item)
            })),
            itemCount: items.length,
            orderStatus: calculateDerivedStatus(items),
            formattedDate: new Date(order.createdAt).toLocaleDateString('en-GB')
        };
    }));

    const totalPages = Math.ceil(totalOrders / limit);

    return {
        orders: ordersWithItems,
        pagination: {
            currentPage: page,
            totalPages,
            totalOrders,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            limit
        }
    };
};

export const createOrder = async ({ userId, paymentMethod, checkoutSession, cartTotals, paymentStatus = "pending" }) => {
    try {
        const addressData = checkoutSession.address;
        const discountAmount = cartTotals.discountAmount || 0;
        const finalAmount = cartTotals.total;

        const newOrder = new Order({
            userId,
            totalAmount: finalAmount,
            subtotal: cartTotals.subtotal, // Now storing items-only subtotal
            discountAmount: discountAmount,
            shippingFee: cartTotals.deliveryFee === 'Free' ? 0 : 50, // Inferred for now, but cleaner
            couponId: cartTotals.appliedCoupon ? cartTotals.appliedCoupon._id : null,
            shippingAddress: {
                name: addressData.name,
                housename: addressData.housename,
                street: addressData.street,
                city: addressData.city,
                state: addressData.state,
                country: addressData.country || 'India',
                pincode: addressData.pincode,
                mobile: addressData.mobile
            },
            paymentMethod,
            paymentStatus: paymentStatus
        });

        await newOrder.save();
        logger.info(`Order created: ${newOrder._id} for user: ${userId}`);

        // Handle Wallet deduction
        if (paymentMethod === "wallet") {
            const wallet = await Wallet.findOne({ userId });
            if (!wallet || wallet.balance < finalAmount) {

                throw new Error("Insufficient wallet balance");
            }

            wallet.balance -= finalAmount;
            const shortOrderId = newOrder._id.toString().slice(-6).toUpperCase();
            wallet.transactions.push({
                walletTransactionId: crypto.randomBytes(8).toString("hex"),
                amount: finalAmount,
                type: 'debit',
                description: `Payment for Order #${shortOrderId}`,
                date: new Date()
            });
            await wallet.save();
            logger.info(`Wallet balance deducted for user: ${userId}, Order: ${newOrder._id}`);
        }

        for (const item of cartTotals.items) {

            await inventoryService.updateStock({
                variantId: item.variantId,
                quantity: -item.quantity,
                reason: "order_placed",
                orderId: newOrder._id
            });

            const orderItem = new OrderItem({
                orderId: newOrder._id,
                variantId: item.variantId,
                productName: item.productName,
                productImage: item.image,
                variantLabel: item.color,
                productQuantity: item.quantity,
                purchasedPrice: item.price,
                status: "pending"
            });
            await orderItem.save();
        }

        // Clear user's cart
        await Cart.deleteMany({ userId });
        logger.info(`Cart cleared for user: ${userId}`);

        return newOrder;
    } catch (error) {
        logger.error(`Order creation failed: ${error.message}`);
        throw error;
    }
};


export const handleItemAction = async ({ orderId, userId, itemId, action, returnReason, returnComment }) => {
    try {
        const order = await Order.findOne({ _id: orderId, userId });
        if (!order) throw new Error("Order not found or access denied");

        const item = await OrderItem.findOne({ _id: itemId, orderId }).populate({
            path: 'variantId',
            populate: { path: 'productId' }
        });
        if (!item) throw new Error("Item not found in this order");

        const currentStatus = item.status;

        if (action === "cancel") {
            if (!["pending", "confirmed"].includes(currentStatus)) {
                throw new Error(`Cannot cancel item with status: ${currentStatus}`);
            }

            item.status = "cancelled";
            item.cancelledOn = new Date();

            await inventoryService.updateStock({
                variantId: item.variantId,
                quantity: item.productQuantity,
                reason: "order_cancelled",
                orderId: order._id,
                notes: "User cancelled item directly"
            });


            if (order.paymentStatus === 'paid' && item.refundStatus !== 'refunded') {
                let refundAmount = walletService.calculateItemRefundAmount(order, item);

                // Apply 50% refund policy for items with offers in price range (1000 - 10000)
                const itemTotal = item.purchasedPrice * item.productQuantity;

                // Re-fetch active offers to check if THIS specific product has an active offer
                const { Offer } = await import("../models/offerModel.js");
                const activeOffers = await Offer.find({ isActive: true });
                const bestOffer = offerHelper.getBestOffer(item.variantId.productId, activeOffers);

                if (bestOffer && itemTotal >= 1000 && itemTotal <= 10000) {
                    refundAmount = refundAmount * 0.5;
                }

                const activeItems = await OrderItem.find({
                    orderId,
                    _id: { $ne: item._id },
                    status: { $nin: ['cancelled', 'returned'] }
                });

                if (activeItems.length === 0) {
                    refundAmount += (order.shippingFee || 0);
                }

                if (refundAmount > 0) {
                    await walletService.refundToWallet(
                        order.userId,
                        refundAmount,
                        `Refund for user-cancelled item (50% policy applied if applicable)`,
                        order._id,
                        item._id
                    );
                }
            }

            const refundAmountForItem = walletService.calculateItemRefundAmount(order, item);
            // order.totalAmount = Math.max(0, order.totalAmount - refundAmountForItem);


            const activeItemsCount = await OrderItem.countDocuments({
                orderId,
                _id: { $ne: item._id },
                status: { $nin: ['cancelled', 'returned'] }
            });
            
        } else if (action === "return") {
            if (currentStatus !== "delivered") {
                throw new Error(`Cannot request return for item with status: ${currentStatus}`);
            }

            item.status = "return_requested";
            item.returnRequestedOn = new Date();
            item.returnReason = returnReason;
            item.returnComment = returnComment;
        } else {
            throw new Error("Invalid action provided");
        }

        await order.save();
        await item.save();

        logger.info(`Item ${action} processed for item ${itemId} (Status: ${item.status})`);

        return {
            order,
            item: {
                ...item.toObject(),
                total: item.purchasedPrice * item.productQuantity,
                finalAmount: walletService.calculateItemRefundAmount(order, item)
            }
        };
    } catch (error) {
        throw error;
    }
};

export const getOrderById = async (orderId, userId) => {
    const order = await Order.findOne({ _id: orderId, userId });
    if (!order) return null;

    const items = await OrderItem.find({ orderId: order._id })
        .populate({
            path: 'variantId',
            populate: { path: 'productId' }
        })
        .lean();

    return {
        ...order.toObject(),
        subtotal: order.subtotal || items.reduce((sum, item) => sum + (item.purchasedPrice * item.productQuantity), 0),
        items: items.map(item => ({
            ...item,
            name: item.productName || item.variantId?.productId?.name || 'Unknown',
            image: item.productImage || item.variantId?.images?.[0] || '',
            label: item.variantLabel || item.variantId?.color || '',
            total: item.purchasedPrice * item.productQuantity,
            finalAmount: walletService.calculateItemRefundAmount(order, item)
        })),
        orderStatus: calculateDerivedStatus(items)
    };
};
