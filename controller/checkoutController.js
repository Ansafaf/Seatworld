import logger from "../utils/logger.js";
import { buildBreadcrumb } from "../utils/breadcrumb.js";

import { Address } from "../models/addressModel.js";
import Order from "../models/orderModel.js";
import Cart from "../models/cartModel.js";
import * as cartService from "../services/cartService.js";
import { getSelectedPaymentMethod } from "../public/js/users/paymentOptions.js";
import Coupon  from "../models/couponModel.js";

export const getCheckoutAddress = async (req, res) => {
    try {
        const userId = req.session.user.id;

        const cartTotals = await cartService.calculateCartTotals(userId);
        if (cartTotals.cartCount === 0) {
            req.session.message = { type: 'error', message: "Your cart is empty" };
            return res.redirect("/cart");
        }
      
        const addresses = await Address.find({ userId }).sort({ isDefault: -1, createdAt: -1 });
        const availableCoupons = await Coupon.find({});
        logger.info(`${cartTotals}`);
        res.render("users/checkout", {
            user: req.session.user,
            addresses,
            ...cartTotals,
            coupons:availableCoupons,
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

        if (!addressData) {
            return res.status(400).json({ success: false, message: "Valid address is required" });
        }
        const requiredFields = ['name', 'street', 'city', 'pincode', 'mobile'];
        for (const field of requiredFields) {
            if (!addressData[field]) {
                return res.status(400).json({ success: false, message: `Missing required field: ${field}` });
            }
        }

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

        res.render("users/paymentOptions", {
            user: req.session.user,
            address: req.session.checkout.address,
            ...cartTotals,
            couponApplied: false, 
            discountAmount: 0     
        });

    } catch (error) {
        logger.error("Payment Options Error:", error);
        res.redirect("/checkout");
    }
}

export const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const paymentMethod = getSelectedPaymentMethod();

        if (!req.session.checkout || !req.session.checkout.address) {
            return res.status(400).json({ success: false, message: "Session expired or address missing" });
        }

        const addressData = req.session.checkout.address;

        const cartTotals = await cartService.calculateCartTotals(userId);

        if (cartTotals.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        const orderItems = cartTotals.items.map(item => ({
            productId: item.productId,
            variantId: item.variantId,
            name: item.productName,
            image: item.image,
            price: item.price,
            quantity: item.quantity,
            total: item.total
        }));

        const newOrder = new Order({
            userId,
            items: orderItems,
            totalAmount: cartTotals.total,
            shippingAddress: {
                name: addressData.name,
                houseName: addressData.houseName || addressData.housename || '',
                street: addressData.street,
                landmark: addressData.landmark || '',
                city: addressData.city,
                pincode: addressData.pincode,
                country: addressData.country || 'India',
                mobile: addressData.mobile
            },
            paymentMethod: paymentMethod, // Default
            orderStatus: 'Pending',
            paymentStatus: 'Pending'
        });

        await newOrder.save();
        await Cart.deleteMany({ userId });
        req.session.checkout = null;
        req.session.order = newOrder;

        if (req.xhr || req.headers.accept.indexOf('json') > -1) {
            return res.status(200).json({
                success: true,
                redirectUrl: `/profile`
            });
        } else {
            res.redirect('/profile');
        }

    } catch (error) {
        logger.error("Place Order Error:", error);
        if (req.xhr) {
            return res.status(500).json({ success: false, message: "Failed to place order" });
        }
        res.redirect('/checkout/payment-options');
    }
}
