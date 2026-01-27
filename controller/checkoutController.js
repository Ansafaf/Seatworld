import logger from "../utils/logger.js";
import { buildBreadcrumb } from "../utils/breadcrumb.js";

import { Address } from "../models/addressModel.js";
import Order from "../models/orderModel.js";
import Cart from "../models/cartModel.js";
import * as cartService from "../services/cartService.js";
import * as inventoryService from "../services/inventoryService.js";
import Coupon from "../models/couponModel.js";
import { status_Codes } from "../enums/statusCodes.js";
import { Message } from "../enums/message.js";

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
        req.session.message = { type: 'error', message: Message.COMMON.SOMETHING_WENT_WRONG };
        res.redirect("/cart");
    }
}

export const postAddress = async (req, res) => {
    try {
        const { addressData, addressId } = req.body;
        const userId = req.session.user.id;

        if (addressId) {
            const existingAddress = await Address.findOne({ _id: addressId, userId });
            if (existingAddress) {
                req.session.checkout = {
                    address: existingAddress.toObject(),
                    addressId: existingAddress._id,
                    step: 'payment'
                };
                return res.status(status_Codes.OK).json({
                    success: true,
                    redirectUrl: "/checkout/payment-options"
                });
            }
        }

        // Validate new address data
        if (!addressData) {
            return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: "Valid address is required" });
        }

        // Text field validation (allowing letters, numbers, spaces, and basic punctuation)
        const textRegex = /^[a-zA-Z0-9\s.,#\-\/]+$/;
        const textFields = ['name', 'street', 'city', 'state', 'country'];

        for (const field of textFields) {
            const value = addressData[field];
            if (!value) {
                return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: `Missing required field: ${field}` });
            }
            if (!textRegex.test(value)) {
                return res.status(status_Codes.BAD_REQUEST).json({
                    success: false,
                    message: `The ${field} field contains invalid characters.`
                });
            }
        }

        // Pincode and Mobile validation
        if (!/^\d{6}$/.test(addressData.pincode)) {
            return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: "Pincode must be exactly 6 digits" });
        }
        if (!/^\d{10}$/.test(addressData.mobile)) {
            return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: "Mobile number must be exactly 10 digits" });
        }

        //Check for existing identical address to prevent duplication
        const duplicateAddress = await Address.findOne({
            userId,
            name: addressData.name,
            housename: addressData.housename || ' ',
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
            //Save the new address
            const newAddress = new Address({
                userId,
                name: addressData.name,
                housename: addressData.housename || '',
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

        return res.status(status_Codes.OK).json({
            success: true,
            redirectUrl: "/checkout/payment-options"
        });

    } catch (error) {
        logger.error("Post Address Error:", error);
        return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to process address" });
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

        const coupon = await Coupon.findOne({ _id: couponId, couponStatus: 'active' });
        if (!coupon) {
            return res.status(status_Codes.NOT_FOUND).json({ success: false, message: Message.COUPON.NOT_FOUND});
        }
    
        if (new Date() > coupon.expiryDate) {
            return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: Message.COUPON.EXPIRED });
        }

        const alreadyUsed = await Order.exists({ userId, couponId: coupon._id });
        if (alreadyUsed) {
            return res.status(status_Codes.BAD_REQUEST).json({ success: false, message: Message.COUPON.ALREADY_USED });
        }


        const currentTotals = await cartService.calculateCartTotals(userId);

        if (currentTotals.rawTotal < coupon.minAmount) {
            return res.status(status_Codes.BAD_REQUEST).json({
                success: false,
                message: `Minimum purchase amount of ₹${coupon.minAmount} required`
            });
        }

        await Cart.updateOne({ userId }, { couponId: coupon._id });

        const newTotals = await cartService.calculateCartTotals(userId);

        return res.json({
            success: true,
            message: Message.COUPON.APPLIED,
            discountAmount: newTotals.discountAmount,
            subtotal: newTotals.rawTotal,
            newTotal: newTotals.total, // This is the "Final Amount" from the service
            code: coupon.couponCode
        });

    } catch (error) {
        logger.error("Apply Coupon Error:", error);
        return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: Message.COUPON.APPLY_FAIL });
    }
}

export const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user.id;

        if (req.session.checkout && req.session.checkout.coupon) {
            delete req.session.checkout.coupon;
        }
        await Cart.updateMany({ userId }, { couponId: null });

        const cartTotals = await cartService.calculateCartTotals(userId);

        return res.json({
            success: true,
            message: Message.COUPON.DELETED_SUCCESS,
            newTotal: cartTotals.total, // "total" is now the raw/undiscounted amount since coupon is gone
            subtotal: cartTotals.rawTotal,
            discountAmount: 0
        });

    } catch (error) {
        logger.error("Remove Coupon Error:", error);
        return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Failed to remove coupon" });
    }
}