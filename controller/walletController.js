import Wallet from "../models/walletModel.js";
import { User } from "../models/userModel.js";
import { buildBreadcrumb } from "../utils/breadcrumb.js";
import { paginate } from "../utils/paginationHelper.js";
import crypto from "crypto";


export const getWallet = async (req, res) => {
    try {
        const userId = req.session.user.id;
        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            wallet = new Wallet({ userId });
            await wallet.save();
        }
        // Sorting transactions
        wallet.transactions.sort((a, b) => b.date - a.date);

        // Take only top 3 for overview
        const recentTransactions = wallet.transactions.slice(0, 3);

        res.render("users/wallet", {
            user: req.user,
            wallet: { ...wallet.toObject(), recentTransactions },
            pagination: null,
            breadcrumbs: buildBreadcrumb([
                { label: "Profile", url: "/profile" },
                { label: "Wallet", url: "/wallet" }
            ])
        });

    } catch (error) {
        console.error("Get Wallet Error:", error);
        res.redirect("/profile");
    }
};

export const getWalletHistory = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 6; // As per design
        const skip = (page - 1) * limit;

        let wallet = await Wallet.findOne({ userId });

        if (!wallet) {
            wallet = new Wallet({ userId });
        }

        const allTransactions = wallet.transactions.sort((a, b) => b.date - a.date);
        const totalItems = allTransactions.length;
        const totalPages = Math.ceil(totalItems / limit);
        const paginatedTransactions = allTransactions.slice(skip, skip + limit);

        const pagination = {
            currentPage: page,
            totalPages,
            totalItems,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            limit
        };

        res.render("users/walletHistory", {
            user: req.user,
            transactions: paginatedTransactions,
            pagination,
            breadcrumbs: buildBreadcrumb([
                { label: "Profile", url: "/profile" },
                { label: "Wallet", url: "/wallet" },
                { label: "History", url: "/wallet/history" }
            ])
        });

    } catch (error) {
        console.error("Get Wallet History Error:", error);
        res.redirect("/wallet");
    }
};

// NOTE: In a real app, this would be a callback from Razorpay/Stripe.
// For now,  implemented a basic add.
export const addMoney = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { amount } = req.body;

        if (!amount || isNaN(amount) || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        let wallet = await Wallet.findOne({ userId });
        if (!wallet) {
            wallet = new Wallet({ userId });
        }

        const numericAmount = parseFloat(amount);

        wallet.transactions.push({
            walletTransactionId: crypto.randomBytes(8).toString("hex"),
            amount: numericAmount,
            type: "credit",
            description: "Added funds to wallet"
        });

        wallet.balance += numericAmount;

        await wallet.save();

        return res.status(200).json({
            success: true,
            message: "Amount added successfully",
            newBalance: wallet.balance
        });

    } catch (error) {
        console.error("Add Money Error:", error);
        return res.status(500).json({ success: false, message: "Failed to add money" });
    }
};
