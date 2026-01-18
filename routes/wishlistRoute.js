import express from "express";
const wishlistRouter = express.Router();
import { requireAuth } from "../middleware/authMiddleware.js";
import { getWishlist, addToWishlist, removeFromWishlist } from "../controller/wishlistController.js";

wishlistRouter.get("/", requireAuth, getWishlist);
wishlistRouter.post("/add", requireAuth, addToWishlist);
wishlistRouter.get("/remove/:variantId", requireAuth, removeFromWishlist);
wishlistRouter.delete("/:variantId", requireAuth, removeFromWishlist);
export default wishlistRouter;
