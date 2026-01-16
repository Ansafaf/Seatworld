// Wallet Routes
import express from "express";
import { getWallet, verifyAndAddMoney, getWalletHistory, createWalletRazorpayOrder } from "../controller/walletController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";
const Walletrouter = express.Router();
Walletrouter.get("/wallet", authMiddleware, getWallet);
Walletrouter.get("/wallet/history", authMiddleware, getWalletHistory);
Walletrouter.post("/wallet/add-money/create-order", authMiddleware, createWalletRazorpayOrder);
Walletrouter.post("/wallet/add-money", authMiddleware, verifyAndAddMoney);

export default Walletrouter;



