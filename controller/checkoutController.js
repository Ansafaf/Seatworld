import logger from "../utils/logger.js";
import { buildBreadcrumb } from "../utils/breadcrumb.js";

import { Address } from "../models/addressModel.js";
import Order from "../models/orderModel.js";
import Cart from "../models/cartModel.js";
import * as cartService from "../services/cartService.js";
import * as inventoryService from "../services/inventoryService.js";
import Coupon from "../models/couponModel.js";

export const getCheckoutAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const cartTotals = await cartService.calculateCartTotals(userId);
        if (cartTotals.cartCount === 0) {
            req.session.message = { type: 'error', message: "Your cart is empty" };
            return res.redirect("/cart");
        }

        // Stock check
        const stockCheck = await inventoryService.checkStockAvailability(cartTotals.items);
        if (!stockCheck.available) {
            req.session.message = {
                type: 'error',
                message: `Insufficient stock for ${stockCheck.item}. Only ${stockCheck.availableStock} left.`
            };
            return res.redirect("/cart");
        }

        const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
        const availableCoupons = await Coupon.find({});
        // logger.info(`${cartTotals}`);
        res.render("users/checkout", {
            user: req.session.user,
            addresses,
            ...cartTotals,
            coupons: availableCoupons,
            appliedCoupon: req.session.checkout?.coupon || null,
            breadcrumbs: buildBreadcrumb([
                { label: "Cart", url: "/cart" },
                { label: "Checkout", url: "/checkout" }
            ])
        });
    } catch (error) {
        logger.error("Checkout Address Page Error:", error);
        req.session.message = { type: 'error', message: "Something went wrong" };
        res.redirect("/cart");
    }
}

export const postAddress = async (req, res) => {
    try {
        const { addressData } = req.body;
        const userId = req.session.user.id;

        if (!addressData) {
            return res.status(400).json({ success: false, message: "Valid address is required" });
        }
        const requiredFields = ['name', 'street', 'city', 'state', 'country', 'pincode', 'mobile'];
        for (const field of requiredFields) {
            if (!addressData[field]) {
                return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
            }
        }

        // Save the new address to the Address collection
        const newAddress = new Address({
            userId,
            name: addressData.name,
            housename: addressData.houseName || addressData.housename || '',
            street: addressData.street,
            city: addressData.city,
            state: addressData.state,
            country: addressData.country,
            pincode: addressData.pincode,
            mobile: addressData.mobile,
            isDefault: false
        });

        await newAddress.save();
        logger.info(`New address saved for user ${userId}: ${newAddress._id}`);

        // Store in session for the order
        req.session.checkout = {
            address: addressData,
            step: 'payment'
        };

        return res.status(200).json({
            success: true,
            redirectUrl: "/checkout/payment-options"
        });

    } catch (error) {
        logger.error("Post Address Error:", error);
        return res.status(500).json({ success: false, message: "Failed to process address" });
    }
}

export const getPaymentOptions = async (req, res) => {
    try {
        if (!req.session.checkout || !req.session.checkout.address) {
            return res.redirect("/checkout");
        }

        const userId = req.session.user.id;
        const cartTotals = await cartService.calculateCartTotals(userId);

        if (cartTotals.cartCount === 0) return res.redirect("/cart");

        // Stock check
        const stockCheck = await inventoryService.checkStockAvailability(cartTotals.items);
        if (!stockCheck.available) {
            req.session.message = {
                type: 'error',
                message: `Insufficient stock for ${stockCheck.item}. Only ${stockCheck.availableStock} left.`
            };
            return res.redirect("/cart");
        }

        res.render("users/paymentOptions", {
            user: req.session.user,
            address: req.session.checkout.address,
            ...cartTotals,
            couponApplied: !!req.session.checkout.coupon,
            discountAmount: req.session.checkout.coupon ? req.session.checkout.coupon.discountAmount : 0
        });

    } catch (error) {
        logger.error("Payment Options Error:", error);
        res.redirect("/checkout");
    }
}

export const applyCoupon = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user.id;

        // Fetch coupon
        const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found or inactive" });
        }

        // Validate expiry
        if (new Date() > coupon.expireDate) {
            return res.status(400).json({ success: false, message: "Coupon has expired" });
        }

        // Validate usage limit
        // Check if user has already used this coupon
        // This assumes you might have a way to track usage, possibly in the Order model or a separate Usage model.
        // For now, let's keep it simple or check against previous orders if needed. 
        // But based on the request, simple application is the first step.

        const cartTotals = await cartService.calculateCartTotals(userId);

        // Validate minimum purchase amount
        if (cartTotals.total < coupon.minimumPurchaseAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase amount of ₹${coupon.minimumPurchaseAmount} required`
            });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.offerType === 'percentage') {
            discountAmount = (cartTotals.total * coupon.offerValue) / 100;
        } else if (coupon.offerType === 'fixed') {
            discountAmount = coupon.offerValue;
        }

        // Ensure discount doesn't exceed total
        if (discountAmount > cartTotals.total) {
            discountAmount = cartTotals.total;
        }

        // Store in session
        req.session.checkout = {
            ...req.session.checkout,
            coupon: {
                code: coupon.code,
                discountAmount: discountAmount,
                _id: coupon._id
            }
        };

        const newTotal = cartTotals.total - discountAmount;

        return res.json({
            success: true,
            message: "Coupon applied successfully",
            discountAmount: discountAmount,
            newTotal: newTotal,
            subtotal: cartTotals.total // Return original total as subtotal
        });

    } catch (error) {
        logger.error("Apply Coupon Error:", error);
        return res.status(500).json({ success: false, message: "Failed to apply coupon" });
    }
}

export const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user.id;

        if (req.session.checkout && req.session.checkout.coupon) {
            delete req.session.checkout.coupon;
        }

        const cartTotals = await cartService.calculateCartTotals(userId);

        return res.json({
            success: true,
            message: "Coupon removed",
            newTotal: cartTotals.total,
            subtotal: cartTotals.total,
            discountAmount: 0
        });

    } catch (error) {
        logger.error("Remove Coupon Error:", error);
        return res.status(500).json({ success: false, message: "Failed to remove coupon" });
    }
}
