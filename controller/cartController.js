import logger from "../utils/logger.js";
import { buildBreadcrumb } from "../utils/breadcrumb.js";
import * as cartService from "../services/cartService.js";
import { status_Codes } from "../enums/statusCodes.js";


export async function getCart(req, res) {
    if (!req.session.user) return res.redirect("/login");

    try {
        const userId = req.session.user.id;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 8;
        const { removedItemNames, ...cartData } = await cartService.getCartByUserId(userId, page, limit);

        if (removedItemNames && removedItemNames.length > 0) {
            req.session.message = {
                type: 'info',
                message: `The following items were removed from your cart as they are currently unavailable: ${removedItemNames.join(', ')}`
            };
        }

        res.render("users/cartlist", {
            user: req.session.user,
            ...cartData,
            breadcrumbs: buildBreadcrumb([
                { label: "Cart", url: "/cart" }
            ])
        });
    } catch (err) {
        logger.error("Cart page error:", err);
        req.session.message = { type: 'error', message: "Unable to load cart page. Please try again." };
        res.redirect("/home");
    }
}


export async function addToCart(req, res) {
    try {
        const { variantId } = req.body;
        const userId = req.session.user.id;

        const cartCount = await cartService.addItemToCart(userId, variantId);

        res.json({
            success: true,
            message: "Added to cart successfully",
            cartCount
        });
    } catch (err) {
        logger.error("Add to cart error:", err);
        res.status(err.message.includes("not found") ? status_Codes.NOT_FOUND : status_Codes.BAD_REQUEST).json({
            success: false,
            message: err.message || "Unable to add product to cart"
        });
    }
}

export async function updateQuantity(req, res) {
    try {
        const { variantId, quantity } = req.body;
        const userId = req.session.user.id;

        const { outOfStock, ...totals } = await cartService.updateItemQuantity(userId, variantId, quantity);

        res.json({
            success: true,
            outOfStock,
            ...totals,
            cartCount: totals.cartCount
        });
    } catch (err) {
        logger.error("Update quantity error:", err);
        res.status(status_Codes.BAD_REQUEST).json({ success: false, message: err.message || "Internal Server Error" });
    }
}


export async function removeFromCart(req, res) {
    try {
        const { variantId } = req.params;
        const userId = req.session.user.id;

        const totals = await cartService.removeItemFromCart(userId, variantId);

        res.json({
            success: true,
            message: "Item removed from cart",
            ...totals,
            cartCount: totals.cartCount
        });
    } catch (err) {

        logger.error("Remove from cart error:", err);
        res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal Server Error" });
    }
}
