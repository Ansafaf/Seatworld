import Order from "../models/orderModel.js";
import OrderItem from "../models/orderItemModel.js";
import Cart from "../models/cartModel.js";
import { Product, ProductVariant } from "../models/productModel.js";
import * as inventoryService from "./inventoryService.js";
import logger from "../utils/logger.js";

export const getUserOrders = async (userId, page = 1, limit = 8, search = "") => {
    const skip = (page - 1) * limit;

    let query = { userId };

    if (search) {
        // Search logic if needed in future
    }

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
            items: items.map(item => ({
                ...item,
                name: item.productName || item.variantId?.productId?.name || 'Unknown',
                image: item.productImage || item.variantId?.images?.[0] || '',
                label: item.variantLabel || item.variantId?.color || '',
                total: item.purchasedPrice * item.productQuantity
            })),
            itemCount: items.length,
            orderStatus: items.length > 0 ? (items.every(i => i.status === items[0].status) ? items[0].status : "Multiple") : "pending",
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

export const createOrder = async ({ userId, paymentMethod, checkoutSession, cartTotals }) => {
    try {
        const addressData = checkoutSession.address;
        const discountAmount = checkoutSession.coupon ? checkoutSession.coupon.discountAmount : 0;
        const finalAmount = Math.max(0, cartTotals.total - discountAmount);

        const newOrder = new Order({
            userId,
            totalAmount: finalAmount,
            shippingAddress: {
                name: addressData.name,
                housename: addressData.houseName || addressData.housename,
                street: addressData.street,
                city: addressData.city,
                state: addressData.state,
                country: addressData.country || 'India',
                pincode: addressData.pincode,
                mobile: addressData.mobile
            },
            paymentMethod,
            paymentStatus: paymentMethod === "COD" ? "pending" : "pending"
        });

        await newOrder.save();
        logger.info(`Order created: ${newOrder._id} for user: ${userId}`);

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

        const item = await OrderItem.findOne({ _id: itemId, orderId });
        if (!item) throw new Error("Item not found in this order");

        const currentStatus = item.status;

        if (action === "cancel") {
            if (!["pending", "confirmed"].includes(currentStatus)) {
                throw new Error(`Cannot request cancellation for item with status: ${currentStatus}`);
            }
            item.status = "cancel_requested";
            item.cancelledOn = new Date();

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
        logger.info(`Item ${action} requested for item ${itemId}`);
        return {
            order,
            item: {
                ...item.toObject(),
                total: item.purchasedPrice * item.productQuantity
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
        items: items.map(item => ({
            ...item,
            name: item.productName || item.variantId?.productId?.name || 'Unknown',
            image: item.productImage || item.variantId?.images?.[0] || '',
            label: item.variantLabel || item.variantId?.color || '',
            total: item.purchasedPrice * item.productQuantity
        }))
    };
};
