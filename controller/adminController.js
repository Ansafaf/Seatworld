import { render } from 'ejs';
import { User } from '../models/userModel.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { paginate } from '../utils/paginationHelper.js';
import { escapeRegExp } from '../utils/regexHelper.js';
import Order from '../models/orderModel.js';
import { status_Codes } from '../enums/statusCodes.js';

dotenv.config();
export const getLoginAdmin = (req, res) => {
    if (req.session?.isAdmin) {
        return res.redirect("/admin/dashboard");
    }

    res.render('admin/adminLogin');
}
export const postLoginAdmin = async (req, res) => {
    const { email, password } = req.body;

    const adminExist = {
        email: process.env.ADMIN_EMAIL,
        password: process.env.ADMIN_PASSWORD
    }


    if (!adminExist.email || !adminExist.password) {
        console.error("Admin credentials not configured in environment variables");
        console.error("Looking for: ADMIN_EMAIL, ADMIN_PASSWORD, AdminMail, or AdminPassword");
        res.locals.message = { type: 'error', message: "Admin credentials not properly stored. Please check environment variables." };
        return res.render('admin/adminLogin');
    }

    if (adminExist.email === email && adminExist.password === password) {
        req.session.isAdmin = true;
        req.session.adminEmail = email;
        return res.status(status_Codes.OK).json({ success: true, message: "Login successful", redirectUrl: "/admin/dashboard" });
    }
    res.status(status_Codes.UNAUTHORIZED).json({ success: false, message: "Invalid email or password", redirectUrl: "/admin/login" });
}

export const getAdminDashboard = async (req, res) => {
    try {
        // Fetch real dashboard statistics
        const [totalUsers, totalOrders, revenueStats] = await Promise.all([
            User.countDocuments(),
            Order.countDocuments({ paymentStatus: { $ne: 'failed' } }),
            Order.aggregate([
                { $match: { paymentStatus: { $ne: 'failed' } } },
                {
                    $group: {
                        _id: null,
                        totalRevenue: { $sum: "$totalAmount" }
                    }
                }
            ])
        ]);

        const totalRevenue = revenueStats[0]?.totalRevenue || 0;

        let admin = {
            email: process.env.ADMIN_EMAIL,
        }

        res.render("admin/dashboard", { 
            totalUsers, 
            totalOrders, 
            totalRevenue: totalRevenue.toFixed(2),
            admin 
        });
    } catch (error) {
        console.error("Dashboard Error:", error);
        res.render("admin/dashboard", { 
            totalUsers: 0, 
            totalOrders: 0, 
            totalRevenue: 0,
            admin: { email: process.env.ADMIN_EMAIL } 
        });
    }
}

export const getRevenueData = async (req, res) => {
    try {
        const { period = 'daily' } = req.query;
        const now = new Date();
        let startDate, endDate;
        let groupFormat = {};

        switch (period) {
            case 'daily':
                // Last 7 days
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 6);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                groupFormat = {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                };
                break;
            case 'weekly':
                // Last 4 weeks
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 27);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                groupFormat = {
                    year: { $year: "$createdAt" },
                    week: { $week: "$createdAt" }
                };
                break;
            case 'monthly':
                // Last 12 months
                startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                groupFormat = {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" }
                };
                break;
            case 'yearly':
                // Last 5 years
                startDate = new Date(now.getFullYear() - 4, 0, 1);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                groupFormat = {
                    year: { $year: "$createdAt" }
                };
                break;
            default:
                startDate = new Date(now);
                startDate.setDate(startDate.getDate() - 6);
                startDate.setHours(0, 0, 0, 0);
                endDate = new Date(now);
                endDate.setHours(23, 59, 59, 999);
                groupFormat = {
                    year: { $year: "$createdAt" },
                    month: { $month: "$createdAt" },
                    day: { $dayOfMonth: "$createdAt" }
                };
        }

        const revenueData = await Order.aggregate([
            {
                $match: {
                    createdAt: { $gte: startDate, $lte: endDate },
                    paymentStatus: { $ne: 'failed' }
                }
            },
            {
                $group: {
                    _id: groupFormat,
                    revenue: { $sum: "$totalAmount" }
                }
            },
            {
                $sort: { "_id": 1 }
            }
        ]);

        // Format data for chart
        const labels = [];
        const data = [];

        revenueData.forEach(item => {
            let label = '';
            if (period === 'daily') {
                const date = new Date(item._id.year, item._id.month - 1, item._id.day);
                label = date.toISOString().split('T')[0];
            } else if (period === 'weekly') {
                label = `Week ${item._id.week}, ${item._id.year}`;
            } else if (period === 'monthly') {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                label = `${monthNames[item._id.month - 1]} ${item._id.year}`;
            } else if (period === 'yearly') {
                label = item._id.year.toString();
            }
            labels.push(label);
            data.push(item.revenue);
        });

        res.json({ success: true, labels, data });
    } catch (error) {
        console.error("Revenue Data Error:", error);
        res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to fetch revenue data" });
    }
}

export const getCustomerlist = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 7;
        const searchQuery = req.query.search || "";

        const query = {};
        if (searchQuery) {
            const escapedSearch = escapeRegExp(searchQuery);
            query.$or = [
                { email: { $regex: escapedSearch, $options: "i" } },
                { name: { $regex: escapedSearch, $options: "i" } },
                { username: { $regex: escapedSearch, $options: "i" } }
            ];
        }

        const { items: users, pagination } = await paginate(User, query, {
            page,
            limit,
            sort: { createdAt: -1 }
        });

        // AJAX Support
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(status_Codes.OK).json({
                success: true,
                users,
                pagination,
                search: searchQuery
            });
        }

        res.render("admin/customerList", {
            users,
            pagination,
            search: searchQuery,
            currentPage: pagination.currentPage,
            limit: pagination.limit
        });
    } catch (error) {
        console.error("Error fetching customers:", error);
        next(error);
    }
}


export const blockUser = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            req.session.message = { type: 'error', message: "user not found" };
            return res.redirect("/admin/users");
        }

        if (user.status == "blocked") {
            return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: "User is already blocked" });
        }

        await User.findByIdAndUpdate(userId, { status: "blocked" });

        res.status(status_Codes.OK).json({ success: true, message: "User blocked successfully", redirectUrl: "/admin/users" });

    } catch (error) {
        console.error("Error blocking user:", error);
        res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal server error"
        });
    }
};
export const unblockUser = async (req, res) => {
    try {
        const userId = req.params.id;

        const user = await User.findById(userId);
        if (!user) {
            req.session.message = { type: 'error', message: "user not found" };
            return res.redirect("/admin/users");
        }

        if (user.status == "active") {
            return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: "User is already unblocked" });
        }

        await User.findByIdAndUpdate(userId, { status: "active" });

        res.status(status_Codes.OK).json({ success: true, message: "User unblocked successfully", redirectUrl: "/admin/users" });

    } catch (error) {
        console.error("Error unblocking user:", error);
        res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const searchUsers = async (req, res) => {
    let query = req.query.search;
    try {
        let admin = "Admin";
        const escapedSearch = escapeRegExp(query);
        const users = await User.find(
            {
                $or: [
                    { email: { $regex: escapedSearch, $options: "i" } },
                    { name: { $regex: escapedSearch, $options: "i" } },
                    { username: { $regex: escapedSearch, $options: "i" } }
                ]
            })

        if (req.xhr) {
            return res.render("partials/userList", { users });
        }
        res.render("admin/adminHome", { admin, users });

    }
    catch (err) {
        res.send("Internal Server error");
    }

}
export const adminLogout = (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.redirect('/admin/adminHome');
        }
        res.clearCookie("admin.id");
        res.redirect("/admin/login");
    })
}