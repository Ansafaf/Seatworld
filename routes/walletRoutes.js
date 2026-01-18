// Wallet Routes
import express from "express";
import { getWallet, verifyAndAddMoney, getWalletHistory, createWalletRazorpayOrder } from "../controller/walletController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
const Walletrouter = express.Router();
Walletrouter.get("/wallet", requireAuth, getWallet);
Walletrouter.get("/wallet/history", requireAuth, getWalletHistory);
Walletrouter.post("/wallet/add-money/create-order", requireAuth, createWalletRazorpayOrder);
Walletrouter.post("/wallet/add-money", requireAuth, verifyAndAddMoney);

export default Walletrouter;



