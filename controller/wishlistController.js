import Wishlist from "../models/wishlistModel.js";
import * as wishlistService from "../services/wishlistService.js";
import Cart from "../models/cartModel.js";
import logger from "../utils/logger.js";
import { paginate } from "../utils/paginationHelper.js";
import { status_Codes } from "../enums/statusCodes.js";

export const getWishlist = async (req, res) => {
    if (!req.session.user) return res.redirect("/login");
    try {
        const userId = req.session.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        
        const cartCount = await Cart.find({ userId: userId }).countDocuments();

        const { items: wishlistItems, pagination } = await paginate(Wishlist, { userId: userId }, {
            page,
            limit,
            populate: {
                path: "variantId",
                populate: {
                    path: "productId",
                    select: "name brand"
                },
                select: "productId price color stock images"
            }
        });

        const wishlist = wishlistItems
            .filter(item => item.variantId) // Filter out items where variant was deleted
            .map(item => ({
                _id: item.variantId._id,
                name: item.variantId.productId?.name || "Product",
                image: item.variantId.images?.[0] || "/images/placeholder.png",
                price: item.variantId.price,
                color: item.variantId.color,
                stock: item.variantId.stock
            }));

        res.render("users/wishlist", {
            cartCount,
            wishlist,
            user: req.session.user,
            pagination
        });
    } catch (error) {
        logger.error("Get Wishlist Error:", error);
        res.status(status_Codes.INTERNAL_SERVER_ERROR).render("500", { error: error.message });
    }
};

export const addToWishlist = async (req, res) => {
     if (!req.session.user) return res.redirect("/login");
    try {
        const userId = req.session.user.id;
        const { variantId } = req.body;

        if (!variantId) {
            return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: "Variant ID is required" });
        }

        const result = await wishlistService.toggleWishlist(userId, variantId);
        const wishlistCount = await Wishlist.countDocuments({ userId });

        res.status(status_Codes.OK).json({
            success: true,
            action: result.action,
            message: result.action === "added" ? "Added to wishlist" : "Removed from wishlist",
            wishlistCount
        });
    } catch (error) {
        logger.error("Add to Wishlist Error:", error);
        res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to update wishlist" });
    }
};

export const removeFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const { variantId } = req.params;

        await wishlistService.removeFromWishlist(userId, variantId);
        const wishlistCount = await Wishlist.countDocuments({ userId });

        if (req.xhr || req.headers.accept.indexOf('json') > -1 || req.method === 'DELETE') {
            return res.status(status_Codes.OK).json({ success: true, message: "Item removed from wishlist", wishlistCount });
        }

        req.session.message = { type: "success", text: "Item removed from wishlist" };
        res.redirect("/wishlist");
    } catch (error) {
        logger.error("Remove from Wishlist Error:", error);
        if (req.xhr || req.headers.accept.indexOf('json') > -1 || req.method === 'DELETE') {
            return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to remove item" });
        }
        req.session.message = { type: "error", text: "Failed to remove item" };
        res.redirect("/wishlist");
    }
};