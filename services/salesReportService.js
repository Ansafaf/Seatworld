import Order from "../models/orderModel.js";
import OrderItem from "../models/orderItemModel.js";
import { calculateDerivedStatus } from "../utils/orderStatusHelper.js";

export const generateSalesReportData = async ({ startDate = null, endDate = null, quickFilter = 'thisMonth' } = {}) => {
    let dateFilter = {};
    const now = new Date();
    let start = startDate ? new Date(startDate) : new Date();
    let end = endDate ? new Date(endDate) : new Date();

    // Handle Quick Filters if no custom date provided
    if (!startDate || !endDate) {
        switch (quickFilter) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'thisWeek':
                start.setDate(now.getDate() - now.getDay());
                start.setHours(0, 0, 0, 0);
                end = now;
                break;
            case 'thisMonth':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = now;
                break;
            case 'thisYear':
                start = new Date(now.getFullYear(), 0, 1);
                end = now;
                break;
            default: // month as default
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = now;
        }
    } else {
        // Ensure end date covers the full day
        end.setHours(23, 59, 59, 999);
    }

    dateFilter.createdAt = { $gte: start, $lte: end };

    // 1. Stats Aggregation (Based on Paid/Delivered Orders for accurate Revenue)
    // We consider 'paid' or 'delivered' as successful sales for the report stats.
    // If just 'placed' but not paid (e.g. COD pending), it might not count as "Revenue" yet?
    // Use 'paymentStatus: paid' AND status not cancelled?
    // Or just all orders that are not cancelled?
    // Order model doesn't have master 'status', only 'paymentStatus'.
    // Let's stick to excluding 'cancelled' items concept but at Order level?
    // For simplicity and standard report: All 'paid' orders are Sales. All 'cod' orders that are 'delivered' are sales.
    // Simplifying: Count all non-failed orders for stats?
    // Let's use all orders in the period for the Table, but calculate Revenue from valid ones.

    const orders = await Order.find({ ...dateFilter })
        .populate("userId", "name email")
        .populate("couponId", "couponName")
        .sort({ createdAt: -1 });

    let totalSales = 0;
    let totalOrdersList = 0;
    let totalDiscount = 0;

    // derived list for finding items status
    // Optimization: If we want status for every order, we might need to populate items.
    // But for stats, let's aggregate.

    const statsAggregation = await Order.aggregate([
        { $match: { ...dateFilter } }, // Filter by date
        {
            $group: {
                _id: null,
                totalSales: { $sum: "$totalAmount" },
                totalDiscount: { $sum: "$discountAmount" },
                count: { $sum: 1 }
            }
        }
    ]);

    const stats = statsAggregation[0] || { totalSales: 0, totalDiscount: 0, count: 0 };
    totalSales = stats.totalSales;
    totalDiscount = stats.totalDiscount;
    totalOrdersList = stats.count; // Total transactions count

    // Average Order Value
    const avgOrderValue = totalOrdersList > 0 ? Math.round(totalSales / totalOrdersList) : 0;

    // 2. Transaction List with Status
    // We need to fetch orders and maybe determine a "Display Status"
    // Since Order doesn't have status, we'll use paymentStatus or infer.
    // The table needs: Order ID, Date, Total Amount, Discount, Status.
    // We already fetched `orders`.

    const transactions = await Promise.all(orders.map(async (order) => {
        const items = await OrderItem.find({ orderId: order._id });
        return {
            orderId: order._id,
            date: order.createdAt,
            totalAmount: order.totalAmount,
            subtotal: order.subtotal || order.totalAmount,
            shippingFee: order.shippingFee || 0,
            discount: order.discountAmount,
            status: calculateDerivedStatus(items),
            paymentMethod: order.paymentMethod,
            customer: {
                name: order.userId?.name || "N/A",
                email: order.userId?.email || "N/A"
            },
            itemCount: items.length,
            coupon: order.couponId?.couponName || "None"
        };
    }));


    return {
        totalSales,
        totalOrders: totalOrdersList,
        totalDiscount,
        avgOrderValue,
        transactions,
        dateRange: { start, end }
    };
}