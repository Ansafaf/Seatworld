import express from "express";
const wishlistRouter = express.Router();
import { authMiddleware } from "../middleware/authMiddleware.js";
import { getWishlist, addToWishlist, removeFromWishlist } from "../controller/wishlistController.js";

wishlistRouter.get("/", authMiddleware, getWishlist);
wishlistRouter.post("/add", authMiddleware, addToWishlist);
wishlistRouter.get("/remove/:variantId", authMiddleware, removeFromWishlist);
wishlistRouter.delete("/:variantId", authMiddleware, removeFromWishlist);
export default wishlistRouter;
