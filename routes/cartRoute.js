import express from "express";
const cartRouter = express.Router();
import { getCart, updateQuantity, removeFromCart, addToCart } from "../controller/cartController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

cartRouter.get("/", requireAuth, getCart);
cartRouter.patch("/update-quantity", requireAuth, updateQuantity);
cartRouter.delete("/remove/:variantId", requireAuth, removeFromCart);
cartRouter.post("/add", requireAuth, addToCart);

export default cartRouter;
