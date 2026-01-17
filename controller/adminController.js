import { render } from 'ejs';
import { User } from '../models/userModel.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import { paginate } from '../utils/paginationHelper.js';

dotenv.config();
export const getLoginAdmin = (req, res) => {
    if (req.session?.isAdmin) {
        return res.redirect("/admin/dashboard");
    }

    res.render('admin/adminLogin');
}
export const postLoginAdmin = async (req, res) => {
    const { email, password } = req.body;

    // Try both new and old environment variable names for backward compatibility
    const adminExist = {
        email: process.env.ADMIN_EMAIL || process.env.AdminMail,
        password: process.env.ADMIN_PASSWORD || process.env.AdminPassword
    }

    // Check if admin credentials are configured
    if (!adminExist.email || !adminExist.password) {
        console.error("Admin credentials not configured in environment variables");
        console.error("Looking for: ADMIN_EMAIL, ADMIN_PASSWORD, AdminMail, or AdminPassword");
        res.locals.message = { type: 'error', message: "Admin credentials not properly stored. Please check environment variables." };
        return res.render('admin/adminLogin');
    }

    if (adminExist.email === email && adminExist.password === password) {
        req.session.isAdmin = true;
        req.session.adminEmail = email;
        return res.status(200).json({ success: true, message: "Login successful", redirectUrl: "/admin/dashboard" });
    }
    res.status(401).json({ success: false, message: "Invalid email or password", redirectUrl: "/admin/login" });
}

export const getAdminDashboard = async (req, res) => {

    let users = await User.find();
    let admin = {
        email: process.env.ADMIN_EMAIL,
    }
    res.render("admin/dashboard", { users, admin });
}

export const getCustomerlist = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const searchQuery = req.query.search || "";

        const query = {};
        if (searchQuery) {
            query.$or = [
                { email: { $regex: searchQuery, $options: "i" } },
                { name: { $regex: searchQuery, $options: "i" } },
                { username: { $regex: searchQuery, $options: "i" } }
            ];
        }

        const { items: users, pagination } = await paginate(User, query, {
            page,
            limit,
            sort: { createdAt: -1 }
        });

        // AJAX Support
        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(200).json({
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

        // Check if user is already blocked
        if (user.status == "blocked") {
            return res.status(200).json({ success: false, message: "User is already blocked" });
        }

        // Block the user
        if(req.session.user.id){
            req.session.destroy((err) => {
            if (err) console.log(err);
              res.clearCookie("connect.sid");
            });
            await User.findByIdAndUpdate(userId, { status: "blocked" });
        }
       

        res.status(200).json({ success: true, message: "User blocked successfully", redirectUrl: "/admin/users" });

    } catch (error) {
        console.error("Error blocking user:", error);
        res.status(500).json({
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
            return res.status(200).json({ success: false, message: "User is already unblocked" });
        }

        await User.findByIdAndUpdate(userId, { status: "active" });

        res.status(200).json({ success: true, message: "User unblocked successfully", redirectUrl: "/admin/users" });

    } catch (error) {
        console.error("Error unblocking user:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const searchUsers = async (req, res) => {
    let query = req.query.search;
    try {
        let admin = "Admin";
        const users = await User.find(
            {
                $or: [
                    { email: { $regex: query, $options: "i" } },
                    { name: { $regex: query, $options: "i" } },
                    { username: { $regex: query, $options: "i" } }
                ]
            })

        if (req.xhr) {
            return res.render("partials/userList", { users });
        }
        res.render("admin/adminHome", { admin, users });

    }
    catch (err) {
        console.log("Search error");
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