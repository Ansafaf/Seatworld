
import Order from "../models/orderModel.js";
import mongoose from "mongoose";


export const getOrderlist = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";

        let query = {};
        if (search) {
            query = {
                $or: [
                    { "items.name": { $regex: search, $options: "i" } },
                    { "_id": mongoose.Types.ObjectId.isValid(search) ? search : null }
                ].filter(condition => condition._id !== null || condition["items.name"])
            };
        }

        const totalOrders = await Order.countDocuments(query);
        const totalPages = Math.ceil(totalOrders / limit);

        const orders = await Order.find(query)
            .sort({ placedAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('userId', 'name email');

        res.render("admin/orderList", {
            orders,
            pagination: {
                currentPage: page,
                totalPages,
                totalOrders,
                limit,
                hasPrevPage: page > 1,
                hasNextPage: page < totalPages
            },
            search
        });

    } catch (error) {
        console.error("Error fetching order list:", error);
        res.status(500).render("500", { message: "Internal Server Error" });
    }
}

export const getOrderUpdate = async (req, res) => {

}
