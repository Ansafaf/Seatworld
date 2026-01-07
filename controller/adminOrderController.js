import Order from "../models/orderModel.js";
import OrderItem from "../models/orderItemModel.js";
import { Product, ProductVariant } from "../models/productModel.js"; // Explicitly import for population
import * as inventoryService from "../services/inventoryService.js";
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
            const isObjectId = mongoose.Types.ObjectId.isValid(search);
            let searchOrderIds = [];

            if (isObjectId) {
                searchOrderIds.push(new mongoose.Types.ObjectId(search));
            }

            const matchingItems = await OrderItem.find()
                .populate({
                    path: 'variantId',
                    populate: { path: 'productId', match: { name: { $regex: search, $options: "i" } } }
                })
                .lean();

            const itemOrderIds = matchingItems
                .filter(item => item.variantId?.productId) 
                .map(item => item.orderId);

            searchOrderIds = [...new Set([...searchOrderIds, ...itemOrderIds])];

            if (orderIds === null) {
                orderIds = searchOrderIds;
            } else {
                // Intersect if both status and search are present
                orderIds = orderIds.filter(id => searchOrderIds.some(sid => sid.equals(id)));
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
            let summaryStatus = "Multiple";
            if (itemStatuses.length === 0) {
                summaryStatus = "pending";
            } else if (new Set(itemStatuses).size === 1) {
                summaryStatus = itemStatuses[0];
            } else if (itemStatuses.includes('pending')) {
                summaryStatus = 'pending';
            }

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

        const formattedOrder = {
            ...order.toObject(),
            items: items.map(item => ({
                ...item,
                name: item.productName || item.variantId?.productId?.name || 'Unknown',
                image: item.productImage || item.variantId?.images?.[0] || '',
                label: item.variantLabel || item.variantId?.color || '',
                total: item.purchasedPrice * item.productQuantity
            }))
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

        const wasInactive = ['cancelled', 'returned'].includes(oldItemStatus);
        const isNowInactive = ['cancelled', 'returned'].includes(status);

        if (!wasInactive && isNowInactive) {
            const itemTotal = item.purchasedPrice * item.productQuantity;
            order.totalAmount = Math.max(0, order.totalAmount - itemTotal);

            await inventoryService.updateStock({
                variantId: item.variantId,
                quantity: item.productQuantity,
                reason: status === 'cancelled' ? "order_cancelled" : "order_returned",
                orderId: order._id
            });
        } else if (wasInactive && !isNowInactive) {
            const itemTotal = item.purchasedPrice * item.productQuantity;
            order.totalAmount += itemTotal;

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

        // Recalculate summary status for the response
        const allItems = await OrderItem.find({ orderId });
        const allStatuses = allItems.map(i => i.status);
        let summaryStatus = "Multiple";
        if (allStatuses.length === 0) {
            summaryStatus = "pending";
        } else if (new Set(allStatuses).size === 1) {
            summaryStatus = allStatuses[0];
        }

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
    try {
        const { itemId } = req.params;
        const { action } = req.body; // 'approve_cancel' or 'approve_return'

        const item = await OrderItem.findById(itemId);
        if (!item) {
            return res.status(404).json({ success: false, message: "Item not found" });
        }

        const order = await Order.findById(item.orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        if (action === 'approve_cancel') {
            if (item.status !== 'cancel_requested') {
                return res.status(400).json({ success: false, message: "Item is not in cancel_requested state" });
            }
            item.status = 'cancelled';
        } else if (action === 'approve_return') {
            if (item.status !== 'return_requested') {
                return res.status(400).json({ success: false, message: "Item is not in return_requested state" });
            }
            item.status = 'returned';
            item.returnedOn = new Date();
            item.refundStatus = 'initiated';
        } else if (action === 'reject_return') {
            if (item.status !== 'return_requested') {
                return res.status(400).json({ success: false, message: "Item is not in return_requested state" });
            }
            item.status = 'delivered';
            item.rejectedOn = new Date();
        } else {
            return res.status(400).json({ success: false, message: "Invalid action" });
        }

        if (action !== 'reject_return') {
            // Apply financial and inventory updates
            const itemTotal = item.purchasedPrice * item.productQuantity;
            order.totalAmount = Math.max(0, order.totalAmount - itemTotal);

            await inventoryService.updateStock({
                variantId: item.variantId,
                quantity: item.productQuantity,
                reason: item.status === 'cancelled' ? "order_cancelled" : "order_returned",
                orderId: order._id
            });
        }

        await order.save();
        await item.save();

        res.json({ success: true, message: `Action ${action} approved successfully` });

    } catch (error) {
        logger.error("Error approving item action:", error);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
};
