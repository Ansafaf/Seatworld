import express from "express";
const cartRouter = express.Router();
import { getCart, updateQuantity, removeFromCart, addToCart } from "../controller/cartController.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

cartRouter.get("/", authMiddleware, getCart);
cartRouter.patch("/update-quantity", authMiddleware, updateQuantity);
cartRouter.delete("/remove/:variantId", authMiddleware, removeFromCart);
cartRouter.post("/add", authMiddleware, addToCart);

export default cartRouter;
