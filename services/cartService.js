import logger from "../utils/logger.js"
import Cart from "../models/cartModel.js";
import { ProductVariant } from "../models/productModel.js";
import mongoose from "mongoose";


import Coupon from "../models/couponModel.js";
import { Offer } from "../models/offerModel.js";
import * as offerHelper from "../utils/offerHelper.js";

export async function calculateCartTotals(userId) {
    const carts = await Cart.find({ userId }).populate({
        path: 'variantId',
        populate: { path: 'productId' }
    });

    // Check for applied coupon on the first item (couponId is same for all cart items of a user usually, or we find one)
    // Actually schema has couponId. Let's find one cart item with couponId or better yet, check if any has it.
    // Note: Mongoose population depends on Schema. The previous checkoutController assumed `userCart` (a single doc?) has couponId.
    // userCart there was `await Cart.findOne`. 
    // Since Cart items are individual documents in this design (probably), we check one.
    const cartWithCoupon = await Cart.findOne({ userId, couponId: { $ne: null } }).populate('couponId');
    let appliedCoupon = null;

    if (cartWithCoupon && cartWithCoupon.couponId) {
        appliedCoupon = cartWithCoupon.couponId;
    }

    const activeOffers = await Offer.find({ isActive: true });

    let subtotal = 0;
    const items = [];

    carts.forEach(item => {
        const variant = item.variantId;
        const product = variant?.productId;

        const isAvailable = variant &&
            variant.stock > 0 &&
            variant.status === "Active" &&
            product &&
            !product.isBlocked;

        if (isAvailable) {
            const basePrice = variant.salePrice || variant.price;
            const offerData = offerHelper.calculateDiscount(product, basePrice, activeOffers);
            const price = offerData.discountedPrice;
            const itemTotal = price * item.productQuantity;
            subtotal += itemTotal;

            items.push({
                productName: product.name,
                image: variant.images && variant.images.length > 0 ? variant.images[0] : '',
                quantity: item.productQuantity,
                price: price,
                salePrice: variant.salePrice || 0,
                regularPrice: variant.price,
                total: itemTotal,
                hasOffer: offerData.hasOffer,
                discountPercentage: offerData.discountPercentage,
                originalPrice: offerData.originalPrice,
                color: variant.color,
                productId: product._id,
                variantId: variant._id,
                outOfStock: false
            });
        } else {
            // Item is out of stock or unavailable, still add to list but don't count in subtotal
            items.push({
                productName: product ? product.name : "Unavailable Product",
                image: variant?.images?.[0] || '',
                quantity: item.productQuantity,
                price: 0,
                total: 0,
                outOfStock: true,
                variantId: variant?._id || item.variantId
            });
        }
    });

    const deliveryFeeValue = subtotal > 0 && subtotal < 1000 ? 50 : 0;
    let total = subtotal + deliveryFeeValue;

    let discountAmount = 0;
    let finalTotal = total;
    let couponDetails = null;

    if (appliedCoupon) {
        // Validate Coupon Validity Again
        const isValid = appliedCoupon.couponStatus === 'active' &&
            new Date() < appliedCoupon.expiryDate &&
            total >= appliedCoupon.minAmount;

        if (isValid) {
            if (appliedCoupon.discountType === 'percentage') {
                discountAmount = (total * appliedCoupon.discountValue) / 100;
            } else {
                discountAmount = appliedCoupon.discountValue;
            }

            // Cap discount at maxAmount if specified
            if (appliedCoupon.maxAmount && appliedCoupon.maxAmount > 0) {
                if (discountAmount > appliedCoupon.maxAmount) {
                    discountAmount = appliedCoupon.maxAmount;
                }
            }

            // Cap discount at total amount
            if (discountAmount > total) discountAmount = total;

            finalTotal = total - discountAmount;

            couponDetails = {
                code: appliedCoupon.couponCode,
                discountAmount: discountAmount,
                _id: appliedCoupon._id
            };
        } else {
            // Invalid coupon, maybe should remove it? 
            // For now, just ignore it in calculation.
        }
    }

    return {
        items,
        subtotal,
        deliveryFee: deliveryFeeValue === 0 ? "Free" : `₹${deliveryFeeValue}`,
        total: finalTotal, // The MAIN total is now the final payable amount
        rawTotal: total,   // The total before discount
        discountAmount,
        appliedCoupon: couponDetails,
        cartCount: carts.length
    };
}


export async function getCartByUserId(userId, page = 1, limit = 8) {
    const skip = (page - 1) * limit;

    const allCartsRaw = await Cart.find({ userId })
        .populate({
            path: 'variantId',
            populate: { path: 'productId' }
        });
    const totalItems = allCartsRaw.length;
    const cartsPerPage = await Cart.find({ userId })
        .populate({
            path: 'variantId',
            populate: { path: 'productId' }
        })
        .skip(skip)
        .limit(limit)
        .lean();//convert to plain js

    const allCarts = await Cart.find({ userId }).populate({
        path: 'variantId',
        populate: { path: 'productId' }
    }).lean();

    allCarts.forEach(item => {
        const variant = item.variantId;
        const product = variant?.productId;

        const isAvailable = variant &&
            variant.stock > 0 &&
            variant.status === "Active" &&
            product &&
            !product.isBlocked;

        if (isAvailable) {
            const basePrice = variant.salePrice || variant.price;
            const offerData = offerHelper.calculateDiscount(product, basePrice, activeOffers);
            subtotal += offerData.discountedPrice * (item.productQuantity || 1);
        }
    });

    const cartItems = cartsPerPage.map(item => {
        const variant = item.variantId;
        const product = variant ? variant.productId : null;
        const itemPrice = (variant && variant.salePrice) ? variant.salePrice : (variant ? variant.price : 0);
        const itemQuantity = item.productQuantity || 1;

        const isAvailable = variant &&
            variant.stock > 0 &&
            variant.status === "Active" &&
            product &&
            !product.isBlocked;

        const offerData = variant && product
            ? offerHelper.calculateDiscount(product, itemPrice, activeOffers)
            : { discountedPrice: itemPrice, hasOffer: false, originalPrice: itemPrice, discountPercentage: 0 };

        return {
            ...item,
            name: product ? product.name : "Unavailable Product",
            image: (variant && variant.images && variant.images.length > 0) ? variant.images[0] : "",
            color: variant ? variant.color : "",
            price: offerData.discountedPrice,
            originalPrice: offerData.originalPrice,
            hasOffer: offerData.hasOffer,
            discountPercentage: offerData.discountPercentage,
            quantity: itemQuantity,
            stock: variant ? variant.stock : 0,
            outOfStock: !isAvailable
        };
    });

    const deliveryFeeValue = subtotal > 0 && subtotal < 1000 ? 50 : 0;
    const total = subtotal + deliveryFeeValue;

    const totalPages = Math.ceil(totalItems / limit) || 1;

    return {
        cartItems,
        subtotal,
        deliveryFee: deliveryFeeValue === 0 ? "Free" : `₹${deliveryFeeValue}`,
        total,
        removedItemNames: [], // No longer removing items automatically
        pagination: {
            currentPage: page,
            totalPages,
            totalItems,
            hasNextPage: page < totalPages,
            hasPrevPage: page > 1,
            limit
        }
    };
}


export async function addItemToCart(userId, variantId) {
    const cartLimit = 6;
    const variant = await ProductVariant.findById(variantId).populate('productId');
    if (!variant) {
        throw new Error("Product variant not found");
    }

    if (variant.stock <= 0 || variant.status !== "Active" || (variant.productId && variant.productId.isBlocked)) {
        throw new Error("This product is currently unavailable");
    }

    let cartItem = await Cart.findOne({ userId, variantId });

    if (cartItem) {
        const newQuantity = (cartItem.productQuantity || 1) + 1;
        if (variant.stock < newQuantity) {
            throw new Error(`Cannot add more. Only ${variant.stock} in stock.`);
        }
        if (cartLimit < newQuantity) {
            throw new Error(`Cannot add more than ${cartLimit}`);
        }
        cartItem.productQuantity = newQuantity;
        await cartItem.save();
    } else {
        cartItem = new Cart({
            userId,
            variantId,
            productQuantity: 1
        });
        await cartItem.save();
    }

    return await Cart.countDocuments({ userId });
}


export async function updateItemQuantity(userId, variantId, quantity) {
    let quantityLimit = 6;
    if (quantity < 1) {
        throw new Error("Quantity must be at least 1");
    }
    if (quantity > quantityLimit) {
        throw new Error("Quantity must be less than or equal to 6");
    }

    const variant = await ProductVariant.findById(variantId).populate('productId');
    const isAvailable = variant &&
        variant.stock > 0 &&
        variant.status === "Active" &&
        variant.productId &&
        !variant.productId.isBlocked;

    if (!isAvailable) {
        return {
            ...(await calculateCartTotals(userId)),
            outOfStock: true
        };
    }

    if (variant.stock < quantity) {
        throw new Error(`Only ${variant.stock} items in stock`);
    }

    await Cart.findOneAndUpdate(
        { userId, variantId },
        { productQuantity: quantity }
    );

    return {
        ...(await calculateCartTotals(userId)),
        outOfStock: false
    };
}


export async function removeItemFromCart(userId, variantId) {
    await Cart.findOneAndDelete({ userId, variantId: new mongoose.Types.ObjectId(variantId) });

    return await calculateCartTotals(userId);
}
