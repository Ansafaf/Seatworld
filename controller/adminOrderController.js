import Order from "../models/orderModel.js";
import { User } from "../models/userModel.js";
import OrderItem from "../models/orderItemModel.js";
import { Product, ProductVariant } from "../models/productModel.js"; // Explicitly import for population
import * as inventoryService from "../services/inventoryService.js";
import * as walletService from "../services/walletService.js";
import logger from "../utils/logger.js";
import mongoose from "mongoose";

export const getOrderlist = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const search = req.query.search || "";
        const status = req.query.status || ""; //item status
        const sort = req.query.sort || "newest";

        let orderIds = null;

        if (status) {
            const items = await OrderItem.find({ status });
            orderIds = items.map(item => item.orderId);
        }


        if (search) {
            let searchOrderIds = [];

            // 1. Search by Order ID (Exact or Partial)
            const idQuery = [];
            if (mongoose.Types.ObjectId.isValid(search)) {
                idQuery.push({ _id: new mongoose.Types.ObjectId(search) });
            }
            // Also try searching for the last 6 characters if it looks like a hex string
            if (/^[0-9a-fA-F]{1,24}$/.test(search)) {
                // This is harder in Mongo without $expr, but we can at least check if it matches the string representation
                // For now, partial ID match is less common, but we can support prefix/suffix if needed.
                // Redirecting to property match for simplicity.
            }

            // 2. Search by Payment/Order Status
            const orderMatches = await Order.find({
                $or: [
                    ...idQuery,
                    { paymentStatus: { $regex: search, $options: "i" } },
                    { paymentMethod: { $regex: search, $options: "i" } }
                ]
            }).select("_id");
            const orderFieldIds = orderMatches.map(o => o._id);

            // 3. Search by User (Email or Name)
            const userMatches = await User.find({
                $or: [
                    { email: { $regex: search, $options: "i" } },
                    { name: { $regex: search, $options: "i" } }
                ]
            }).select("_id");
            const userIds = userMatches.map(u => u._id);
            const userOrderMatches = await Order.find({ userId: { $in: userIds } }).select("_id");
            const userOrderIds = userOrderMatches.map(o => o._id);

            // 4. Search by Product Name (Find matching products -> variants -> items)
            const productMatches = await Product.find({
                name: { $regex: search, $options: "i" }
            }).select("_id");
            const productIds = productMatches.map(p => p._id);

            const variantMatches = await ProductVariant.find({
                productId: { $in: productIds }
            }).select("_id");
            const variantIds = variantMatches.map(v => v._id);

            const itemMatches = await OrderItem.find({
                $or: [
                    { variantId: { $in: variantIds } },
                    { productName: { $regex: search, $options: "i" } }, // Also check recorded productName
                    { status: { $regex: search, $options: "i" } }      // Include item status
                ]
            }).select("orderId");
            const productOrderIds = itemMatches.map(item => item.orderId);

            searchOrderIds = [
                ...new Set([
                    ...orderFieldIds,
                    ...userOrderIds,
                    ...productOrderIds
                ])
            ];

            if (orderIds === null) {
                orderIds = searchOrderIds;
            } else {
                orderIds = orderIds.filter(id =>
                    searchOrderIds.some(sid => sid.equals(id))
                );
            }
        }


        let query = {};
        if (orderIds !== null) {
            query._id = { $in: orderIds };
        }

        let sortQuery = { createdAt: -1 };
        if (sort === "oldest") sortQuery = { createdAt: 1 };
        else if (sort === "priceHighToLow") sortQuery = { totalAmount: -1 };
        else if (sort === "priceLowToHigh") sortQuery = { totalAmount: 1 };

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find(query)
            .sort(sortQuery)
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name email');

        const ordersWithItems = await Promise.all(orders.map(async (order) => {
            const items = await OrderItem.find({ orderId: order._id })
                .populate({
                    path: 'variantId',
                    populate: { path: 'productId' }
                })
                .lean();

            const itemStatuses = items.map(i => i.status);

            // Derived Status Logic
            const summaryStatus = calculateDerivedStatus(items);

            return {
                ...order.toObject(),
                items: items.map(item => ({
                    ...item,
                    name: item.productName || item.variantId?.productId?.name || 'Unknown',
                    image: item.productImage || item.variantId?.images?.[0] || '',
                    label: item.variantLabel || item.variantId?.color || ''
                })),
                orderStatus: summaryStatus,
                itemCount: items.length
            };
        }));

        res.render("admin/orderList", {
            orders: ordersWithItems,
            pagination: {
                currentPage: page,
                totalPages,
                totalOrders,
                limit,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages
            },
            search,
            status,
            sort
        });

    } catch (error) {
        console.error("Error fetching order list:", error);
        res.status(500).render("500", { message: "Internal Server Error" });
    }
}

export const getOrderDetails = async (req, res) => {
    try {

        const { id } = req.params;
        const order = await Order.findById(id).populate('userId', 'name email mobile');

        if (!order) {
            return res.status(404).render("500", { message: "Order not found" });
        }

        const items = await OrderItem.find({ orderId: order._id })
            .populate({
                path: 'variantId',
                populate: { path: 'productId' }
            })
            .lean();

        const summaryStatus = calculateDerivedStatus(items);

        const formattedOrder = {
            ...order.toObject(),
            items: items.map(item => ({
                ...item,
                name: item.productName || item.variantId?.productId?.name || 'Unknown',
                image: item.productImage || item.variantId?.images?.[0] || '',
                label: item.variantLabel || item.variantId?.color || '',
                total: item.purchasedPrice * item.productQuantity,
                finalAmount: walletService.calculateItemRefundAmount(order, item)
            })),
            orderStatus: summaryStatus
        };

        res.render("admin/orderDetails", {
            order: formattedOrder,
            path: '/admin/orders'
        });

    } catch (error) {
        console.error("Error fetching order details:", error);
        res.status(500).render("500", { message: "Internal Server Error" });
    }
}

export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, status } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        await OrderItem.updateMany({ orderId }, { status });

        if (status === 'delivered') {
            order.paymentStatus = 'paid';
        } else if (['cancelled', 'returned'].includes(status)) {

            const items = await OrderItem.find({ orderId });
            for (const item of items) {
                if (!['cancelled', 'returned'].includes(item.status)) {
                    await inventoryService.updateStock({
                        variantId: item.variantId,
                        quantity: item.productQuantity,
                        reason: status === 'cancelled' ? "order_cancelled" : "order_returned",
                        orderId: order._id,
                        notes: "Bulk order status update by admin"
                    });
                }
            }
            order.totalAmount = 0;
        }

        await order.save();

        // Handle Wallet Refund for bulk status update
        if (['cancelled', 'returned'].includes(status) && order.paymentStatus === 'paid') {
            const items = await OrderItem.find({ orderId });
            let totalRefund = 0;
            const newlyRefundedItemIds = [];

            for (const item of items) {
                // We refund if the item was just changed to cancelled/returned or was already cancelled/returned but not refunded
                if (item.status === status && item.refundStatus !== 'refunded') {
                    const refundAmount = walletService.calculateItemRefundAmount(order, item);
                    totalRefund += refundAmount;
                    newlyRefundedItemIds.push(item._id);
                }
            }

            // If ALL items are now cancelled/returned, we refund everything left in the order (including shipping)
            const remainingActiveItems = items.filter(i => !['cancelled', 'returned'].includes(i.status));
            if (remainingActiveItems.length === 0) {
                // Determine what's already been refunded
                const alreadyRefundedTotal = items.reduce((sum, i) => sum + (i.refundAmount || 0), 0);
                totalRefund = Math.max(0, order.subtotal + (order.shippingFee || 0) - order.discountAmount - alreadyRefundedTotal);
            }

            if (totalRefund > 0) {
                const transactionId = await walletService.refundToWallet(
                    order.userId,
                    totalRefund,
                    `Bulk refund for ${status} order`,
                    order._id
                );

                // Update all newly refunded items
                await OrderItem.updateMany(
                    { _id: { $in: newlyRefundedItemIds } },
                    {
                        refundStatus: 'refunded',
                        refundedOn: new Date(),
                        refundAmount: totalRefund / (newlyRefundedItemIds.length || 1) // Proportional for tracking
                    }
                );
            }
        }

        res.json({ success: true, message: "Order and items updated successfully" });

    } catch (error) {
        console.error("Error updating order status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

export const updateItemStatus = async (req, res) => {
    try {
        const itemId = req.params.itemId || req.body.itemId;
        const { orderId, status } = req.body;

        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const item = await OrderItem.findById(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        const oldItemStatus = item.status;

        if (oldItemStatus === status) {
            return res.status(400).json({ success: false, message: "Status is already set to " + status });
        }

        item.status = status;

        // If an item is delivered, mark the whole order as paid (critical for COD logic)
        if (status === 'delivered') {
            order.paymentStatus = 'paid';
        }

        const wasInactive = ['cancelled', 'returned'].includes(oldItemStatus);
        const isNowInactive = ['cancelled', 'returned'].includes(status);

        if (!wasInactive && isNowInactive) {
            const refundAmountForItem = walletService.calculateItemRefundAmount(order, item);
            order.totalAmount = Math.max(0, order.totalAmount - refundAmountForItem);

            // Check if this is the last active item to also remove shipping fee from total
            const activeItemsCount = await OrderItem.countDocuments({
                orderId,
                _id: { $ne: item._id },
                status: { $nin: ['cancelled', 'returned'] }
            });

            if (activeItemsCount === 0) {
                order.totalAmount = 0;
            }

            await inventoryService.updateStock({
                variantId: item.variantId,
                quantity: item.productQuantity,
                reason: status === 'cancelled' ? "order_cancelled" : "order_returned",
                orderId: order._id
            });
        } else if (wasInactive && !isNowInactive) {
            const refundAmountForItem = walletService.calculateItemRefundAmount(order, item);
            order.totalAmount += refundAmountForItem;

            // If we are reactivating the first item, add shipping fee back to total
            const otherActiveItemsCount = await OrderItem.countDocuments({
                orderId,
                _id: { $ne: item._id },
                status: { $nin: ['cancelled', 'returned'] }
            });

            if (otherActiveItemsCount === 0) {
                order.totalAmount += (order.shippingFee || 0);
            }

            await inventoryService.updateStock({
                variantId: item.variantId,
                quantity: -item.productQuantity,
                reason: "admin_edit",
                orderId: order._id,
                notes: "Item reactivated from cancelled/returned status"
            });
        }

        await order.save();
        await item.save();

        // Handle Wallet Refund for single item status change
        // Safeguard for COD: Only refund if the item is RETURNED (cancellations aren't paid for in COD)
        const isRefundableStatus = (order.paymentMethod === 'COD') ? (status === 'returned') : isNowInactive;

        if (isRefundableStatus && order.paymentStatus === 'paid' && item.refundStatus !== 'refunded') {
            let refundAmount = walletService.calculateItemRefundAmount(order, item);

            // Check if this is the last active item to include shipping fee
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
                    `Refund for ${status} item`,
                    order._id,
                    item._id
                );
            }
        }

        // Recalculate summary status for the response
        const allItems = await OrderItem.find({ orderId });
        const summaryStatus = calculateDerivedStatus(allItems);

        res.json({
            success: true,
            message: "Item status updated successfully",
            orderStatus: summaryStatus
        });

    } catch (error) {
        console.error("Error updating item status:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};

export const approveItemAction = async (req, res) => {
    const { itemId } = req.params;
    const { action } = req.body;

    try {
        const item = await OrderItem.findById(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        const order = await Order.findById(item.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        const orderId = order._id;
        const currentStatus = (item.status || "").toLowerCase().replace(/_/g, " ");
        const isReturnRequested = currentStatus === 'return requested' || item.returnReason;

        if (action === 'approve_return') {
            if (!isReturnRequested) {
                return res.status(400).json({ success: false, message: `Item is not in return_requested state (current: ${item.status})` });
            }
            item.status = 'returned';
            item.returnedOn = new Date();
            item.refundStatus = 'initiated';
        } else if (action === 'reject_return') {
            if (!isReturnRequested) {
                return res.status(400).json({ success: false, message: `Item is not in return_requested state (current: ${item.status})` });
            }
            item.status = 'delivered';
            item.rejectedOn = new Date();
        } else {
            return res.status(400).json({ success: false, message: "Invalid action" });
        }

        if (action !== 'reject_return') {
            // Apply financial and inventory updates
            const refundAmountForItem = walletService.calculateItemRefundAmount(order, item);
            order.totalAmount = Math.max(0, order.totalAmount - refundAmountForItem);

            // Check if this is the last active item to also remove shipping fee from total
            const activeItemsCount = await OrderItem.countDocuments({
                orderId,
                _id: { $ne: item._id },
                status: { $nin: ['cancelled', 'returned'] }
            });

            if (activeItemsCount === 0) {
                order.totalAmount = 0;
            }

            await inventoryService.updateStock({
                variantId: item.variantId,
                quantity: item.productQuantity,
                reason: item.status === 'cancelled' ? "order_cancelled" : "order_returned",
                orderId: order._id
            });
        }

        await order.save();
        await item.save();

        // Handle Wallet Refund for approved action
        // Safeguard for COD: Only refund if the item is RETURNED (cancellations aren't paid for in COD)
        const isRefundableStatus = (order.paymentMethod === 'COD') ? (item.status === 'returned') : true;

        if (isRefundableStatus && order.paymentStatus === 'paid' && item.refundStatus !== 'refunded') {
            let refundAmount = walletService.calculateItemRefundAmount(order, item);

            // Check if this is the last active item to include shipping fee
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
                    `Refund for approved ${item.status}`,
                    order._id,
                    item._id
                );
            }
        }

        // Recalculate summary status for the response
        const allItems = await OrderItem.find({ orderId });
        const summaryStatus = calculateDerivedStatus(allItems);

        res.json({
            success: true,
            message: `Action ${action} approved successfully`,
            orderStatus: summaryStatus
        });

    } catch (error) {
        logger.error("Error approving item action:", error);
        res.status(500).json({
            success: false,
            message: `Failed to ${action ? action.replace('_', ' ') : 'process'}: ${error.message}`
        });
    }
};

const calculateDerivedStatus = (items) => {
    const itemStatuses = items.map(i => i.status);
    const totalItems = items.length;
    const deliveredCount = items.filter(i => i.status === 'delivered').length;
    const returnedCount = items.filter(i => i.status === 'returned').length;
    const cancelledCount = items.filter(i => i.status === 'cancelled').length;

    if (totalItems === 0) return "Pending";
    if (returnedCount === totalItems) return "Returned";
    if (returnedCount > 0) return "Partially Returned";
    if (deliveredCount === totalItems) return "Delivered";
    if (deliveredCount > 0) return "Partially Delivered";
    if (cancelledCount === totalItems) return "Cancelled";
    if (cancelledCount > 0) return "Partially Cancelled";

    if (new Set(itemStatuses).size === 1) {
        return itemStatuses[0];
    }

    if (items.some(i => i.status === 'shipped')) {
        return "Shipped";
    }

    return items[0]?.status || "Pending";
};
