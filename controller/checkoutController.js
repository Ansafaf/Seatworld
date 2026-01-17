import logger from "../utils/logger.js";
import { buildBreadcrumb } from "../utils/breadcrumb.js";

import { Address } from "../models/addressModel.js";
import Order from "../models/orderModel.js";
import Cart from "../models/cartModel.js";
import * as cartService from "../services/cartService.js";
import * as inventoryService from "../services/inventoryService.js";
import Coupon from "../models/couponModel.js";

export const getCheckoutAddress = async (req, res) => {
      if (!req.session.user) return res.redirect("/login");
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


        // CLEAR persistent coupon on checkout entry UNLESS it was just applied
        // CLEAR persistent coupon on checkout entry (User request: Manual apply only)
        // Since we now use AJAX for application, any fresh page load should clear the coupon to prevent auto-apply from history.
        await Cart.updateOne({ userId }, { couponId: null });
        if (req.session.checkout) {
            delete req.session.checkout.coupon;
        }
        logger.info('Cleared persistent coupon on checkout entry');

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
        const { addressData, addressId } = req.body;
        const userId = req.session.user.id;

        // 1. If we have an addressId, it's an existing address. No need to save.
        if (addressId) {
            const existingAddress = await Address.findOne({ _id: addressId, userId });
            if (existingAddress) {
                req.session.checkout = {
                    address: existingAddress.toObject(),
                    addressId: existingAddress._id,
                    step: 'payment'
                };
                return res.status(200).json({
                    success: true,
                    redirectUrl: "/checkout/payment-options"
                });
            }
        }

        // 2. Validate new address data
        if (!addressData) {
            return res.status(400).json({ success: false, message: "Valid address is required" });
        }
        const requiredFields = ['name', 'street', 'city', 'state', 'country', 'pincode', 'mobile'];
        for (const field of requiredFields) {
            if (!addressData[field]) {
                return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
            }
        }

        // 3. Check for existing identical address to prevent duplication
        const duplicateAddress = await Address.findOne({
            userId,
            name: addressData.name,
            housename: addressData.houseName || ' ',
            street: addressData.street,
            city: addressData.city,
            pincode: addressData.pincode,
            mobile: addressData.mobile
        });

        if (duplicateAddress) {
            logger.info("Using existing duplicate address instead of saving new one");
            req.session.checkout = {
                address: duplicateAddress.toObject(),
                addressId: duplicateAddress._id,
                step: 'payment'
            };
        } else {
            // 4. Save the new address
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

            req.session.checkout = {
                address: newAddress.toObject(),
                addressId: newAddress._id,
                step: 'payment'
            };
        }

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
        // Service now returns total WITH discount if coupon applied
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
            couponApplied: !!cartTotals.appliedCoupon,
            discountAmount: cartTotals.discountAmount || 0,
            // Explicitly passing raw subtotal if needed by view, though service returns 'subtotal' (items only) and 'rawTotal' (items+delivery) 
            // view uses 'total' which is final.
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


        const currentTotals = await cartService.calculateCartTotals(userId);
        // Note: currentTotals.rawTotal is the amount before discount.

        if (currentTotals.rawTotal < coupon.minAmount) {
            return res.status(400).json({
                success: false,
                message: `Minimum purchase amount of ₹${coupon.minAmount} required`
            });
        }

        // Apply to DB
        await Cart.updateOne({ userId }, { couponId: coupon._id });

        // Recalculate with new coupon
        const newTotals = await cartService.calculateCartTotals(userId);

        // Response
        return res.json({
            success: true,
            message: "Coupon applied successfully",
            discountAmount: newTotals.discountAmount,
            subtotal: newTotals.rawTotal,
            newTotal: newTotals.total, // This is the "Final Amount" from the service
            code: coupon.couponCode
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

        // Recalculate (will now be without discount)
        const cartTotals = await cartService.calculateCartTotals(userId);

        return res.json({
            success: true,
            message: "Coupon removed",
            newTotal: cartTotals.total, // "total" is now the raw/undiscounted amount since coupon is gone
            subtotal: cartTotals.rawTotal,
            discountAmount: 0
        });

    } catch (error) {
        logger.error("Remove Coupon Error:", error);
        return res.status(500).json({ success: false, message: "Failed to remove coupon" });
    }
}
