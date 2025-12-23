import { render } from 'ejs';
import { User } from '../models/userModel.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

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
        return res.redirect("/admin/dashboard");
    }
    res.locals.message = { type: 'error', message: "invalid email or password" };
    res.render('admin/adminLogin');
}

export const getAdminDashboard = async (req, res) => {

    let users = await User.find();
    let admin = {
        email: process.env.ADMIN_EMAIL,
    }
    res.render("admin/dashboard", { users, admin });
}

export const getCustomerlist = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const skip = (page - 1) * limit;
        const searchQuery = req.query.search || "";

        const query = {};
        if (searchQuery) {
            query.$or = [
                { email: { $regex: searchQuery, $options: "i" } },
                { name: { $regex: searchQuery, $options: "i" } },
                { username: { $regex: searchQuery, $options: "i" } }
            ];
        }

        const totalUsers = await User.countDocuments(query);
        const totalPages = Math.ceil(totalUsers / limit);

        const users = await User.find(query)
            .skip(skip)
            .limit(limit)
            .sort({ createdAt: -1 });

        let admin = {
            email: process.env.ADMIN_EMAIL,
        }

        res.render("admin/customerList", {
            users,
            admin,
            currentPage: page,
            totalPages,
            search: searchQuery
        });
    } catch (error) {

        console.error("Error fetching customers:", error);
        res.status(500).send("Something went wrong!");
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
            req.session.message = { type: 'warning', message: "user is already blocked" };
            return res.redirect("/admin/users");
        }

        // Block the user
        await User.findByIdAndUpdate(userId, { status: "blocked" });

        req.session.message = { type: 'success', message: "user blocked successfully" };
        res.redirect("/admin/users");

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
            req.session.message = { type: 'warning', message: "user is already unblocked" };
            return res.redirect("/admin/users");
        }

        await User.findByIdAndUpdate(userId, { status: "active" });

        req.session.message = { type: 'success', message: "user unblocked successfully" };
        res.redirect("/admin/users");

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