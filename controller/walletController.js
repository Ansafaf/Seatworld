import Wallet from "../models/walletModel.js";
import { User } from "../models/userModel.js";
import { buildBreadcrumb } from "../utils/breadcrumb.js";
import { paginate } from "../utils/paginationHelper.js";
import crypto from "crypto";
import { razorpayInstance } from "../config/razorpayConfig.js";
import { status_Codes } from "../enums/statusCodes.js";


export const createWalletRazorpayOrder = async (req, res) => {
  try {
    const { amount } = req.body;
    if (!amount || isNaN(amount) || amount <= 0) {
      return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: "Invalid amount" });
    }

    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency: "INR",
      receipt: `wallet_topup_${Date.now()}`,
    };

    const order = await razorpayInstance.orders.create(options);

    return res.status(status_Codes.OK).json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });

  } catch (error) {
    console.error("Create Wallet Razorpay Order Error:", error);
    return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to create payment order" });
  }
};


export const getWallet = async (req, res) => {
    if (!req.session.user) return res.redirect("/login");
  try {
    const userId = req.session.user.id;
    let wallet = await Wallet.findOne({ userId });

    if (!wallet) {
      wallet = new Wallet({ userId });
      await wallet.save();
    }
    // Sorting transactions
    wallet.transactions.sort((a, b) => b.date - a.date);

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
   if (!req.session.user) return res.redirect("/login");
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

export const verifyAndAddMoney = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: "Payment data missing" });
    }

    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: "Invalid payment signature" });
    }

    let wallet = await Wallet.findOne({ userId });
    if (!wallet) {
      wallet = new Wallet({ userId, balance: 0, transactions: [] });
    }

    const alreadyCredited = wallet.transactions.find(
      tx => tx.razorpayPaymentId === razorpay_payment_id
    );

    if (alreadyCredited) {
      return res.json({ success: true, message: "Already credited" });
    }

    const numericAmount = Number(amount);

    wallet.transactions.push({
      walletTransactionId: crypto.randomBytes(8).toString("hex"),
      amount: numericAmount,
      type: "credit",
      description: "Wallet top-up via Razorpay",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: "success"
    });

    wallet.balance += numericAmount;

    await wallet.save();

    return res.status(status_Codes.OK).json({
      success: true,
      message: "Money added to wallet",
      newBalance: wallet.balance
    });

  } catch (error) {
    console.error("Verify & Add Money Error:", error);
    return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Wallet update failed" });
  }
};