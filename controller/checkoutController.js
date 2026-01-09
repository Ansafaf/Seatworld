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

        const stockCheck = await inventoryService.checkStockAvailability(cartTotals.items);
        if (!stockCheck.available) {
            req.session.message = {
                type: 'error',
                message: `Insufficient stock for ${stockCheck.item}. Only ${stockCheck.availableStock} left.`
            };
            return res.redirect("/cart");
        }

        const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
        const availableCoupons = await Coupon.find({ couponStatus: 'active', expiryDate: { $gt: new Date() } });
        logger.info(`Found ${availableCoupons.length} available coupons for checkout`);


        // CLEAR persistent coupon on checkout entry (User request: Manual apply only)
        // This ensures the user must explicitly click "Apply" every time they enter checkout.
        await Cart.updateOne({ userId }, { couponId: null });
        if (req.session.checkout) {
            delete req.session.checkout.coupon;
        }

        let appliedCoupon = null;
        let discountAmount = 0;

        // logger.info(`${cartTotals}`);
        res.render("users/checkout", {
            user: req.session.user,
            addresses,
            ...cartTotals,
            coupons: availableCoupons,
            appliedCoupon: appliedCoupon,
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

        // Re-validate coupon from DB
        let discountAmount = 0;
        let couponApplied = false;
        const userCart = await Cart.findOne({ userId, couponId: { $ne: null } }).populate('couponId');

        if (userCart && userCart.couponId) {
            const coupon = userCart.couponId;
            if (coupon.couponStatus === 'active' && new Date() < coupon.expiryDate && cartTotals.total >= coupon.minAmount) {
                if (coupon.discountType === 'percentage') {
                    discountAmount = (cartTotals.total * coupon.discountValue) / 100;
                } else if (coupon.discountType === 'flat') {
                    discountAmount = coupon.discountValue;
                }

                if (discountAmount > cartTotals.total) discountAmount = cartTotals.total;
                couponApplied = true;
            }
        }

        res.render("users/paymentOptions", {
            user: req.session.user,
            address: req.session.checkout.address,
            ...cartTotals,
            couponApplied,
            discountAmount
        });

    } catch (error) {
        logger.error("Payment Options Error:", error);
        res.redirect("/checkout");
    }
}

export const applyCoupon = async (req, res) => {
    try {
        const { couponId } = req.body;
        const userId = req.session.user.id;

        // Fetch coupon
        const coupon = await Coupon.findOne({ _id: couponId, couponStatus: 'active' });
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found or inactive" });
        }
        // Validate expiry
        if (new Date() > coupon.expiryDate) {
            return res.status(400).json({ success: false, message: "Coupon has expired" });
        }

        // Validate usage limit
        const alreadyUsed = await Order.exists({ userId, couponId: coupon._id });
        if (alreadyUsed) {
            return res.status(400).json({ success: false, message: "Coupon already used" });
        }
        const cartTotals = await cartService.calculateCartTotals(userId);

        // Validate minimum purchase amount
        if (cartTotals.total < coupon.minAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase amount of ₹${coupon.minAmount} required`
            });
        }

        // Calculate discount
        let discountAmount = 0;
        if (coupon.discountType === 'percentage') {
            discountAmount = (cartTotals.total * coupon.discountValue) / 100;
        } else {
            // Assumes 'flat' since enum is restricted to 'flat' or 'percentage'
            discountAmount = coupon.discountValue;
        }

        // Ensure discount doesn't exceed total
        if (discountAmount > cartTotals.total) {
            discountAmount = cartTotals.total;
        }

        // Store in DB (Cart)
        await Cart.updateOne({ userId }, { couponId: coupon._id });

        // Store in session (keep for immediate response consistency)
        req.session.checkout = {
            ...req.session.checkout,
            coupon: {
                code: coupon.couponCode,
                discountAmount: discountAmount,
                _id: coupon._id
            }
        };

        const newTotal = cartTotals.total - discountAmount;

        return res.json({
            success: true,
            message: "Coupon applied successfully",
            discountAmount: discountAmount,
            subtotal: cartTotals.total, // Return original total as subtotal
            newTotal: newTotal
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

        // Remove from DB
        await Cart.updateMany({ userId }, { couponId: null });

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
