import logger from "../utils/logger.js"
import Cart from "../models/cartModel.js";
import { ProductVariant } from "../models/productModel.js";
import mongoose from "mongoose";


import Coupon from "../models/couponModel.js";
import { Offer } from "../models/offerModel.js";
import * as offerHelper from "../utils/offerHelper.js";

export async function calculateCartTotals(userId, providedCarts = null, providedOffers = null) {
    // 1. Parallelize initial data fetching if not provided
    const [carts, activeOffers] = await Promise.all([
        providedCarts || Cart.find({ userId }).populate({
            path: 'variantId',
            populate: { path: 'productId' }
        }).lean(),
        providedOffers || Offer.find({ isActive: true }).lean()
    ]);

    if (!carts.length) {
        return {
            items: [], subtotal: 0, deliveryFee: "Free", total: 0,
            rawTotal: 0, discountAmount: 0, appliedCoupon: null, cartCount: 0
        };
    }

    // 2. Optimized Coupon Fetch (only if any cart item has it)
    const firstCouponId = carts.find(c => c.couponId)?.couponId;
    let appliedCoupon = null;
    if (firstCouponId) {
        appliedCoupon = await Coupon.findById(firstCouponId).lean();
    }

    let subtotal = 0;
    const items = carts.map(item => {
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

            return {
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
            };
        } else {
            return {
                productName: product ? product.name : "Unavailable Product",
                image: variant?.images?.[0] || '',
                quantity: item.productQuantity,
                price: 0,
                total: 0,
                outOfStock: true,
                variantId: variant?._id || item.variantId
            };
        }
    });

    const deliveryFeeValue = subtotal > 0 && subtotal < 1000 ? 50 : 0;
    const rawTotal = subtotal + deliveryFeeValue;

    let discountAmount = 0;
    let couponDetails = null;

    if (appliedCoupon && appliedCoupon.couponStatus === 'active' &&
        new Date() < new Date(appliedCoupon.expiryDate) &&
        rawTotal >= appliedCoupon.minAmount) {

        if (appliedCoupon.discountType === 'percentage') {
            discountAmount = (rawTotal * appliedCoupon.discountValue) / 100;
            if (appliedCoupon.maxAmount && discountAmount > appliedCoupon.maxAmount) {
                discountAmount = appliedCoupon.maxAmount;
            }
        } else {
            discountAmount = appliedCoupon.discountValue;
        }

        discountAmount = Math.min(discountAmount, rawTotal);
        couponDetails = {
            code: appliedCoupon.couponCode,
            discountAmount: discountAmount,
            _id: appliedCoupon._id
        };
    }

    return {
        items,
        subtotal,
        deliveryFee: deliveryFeeValue === 0 ? "Free" : `₹${deliveryFeeValue}`,
        total: rawTotal - discountAmount,
        rawTotal,
        discountAmount,
        appliedCoupon: couponDetails,
        cartCount: carts.length
    };
}


export async function getCartByUserId(userId, page = 1, limit = 8) {
    // 1. Reduced to ONE main query for all user cart data
    const [allCarts, activeOffers] = await Promise.all([
        Cart.find({ userId }).populate({
            path: 'variantId',
            populate: { path: 'productId' }
        }).lean(),
        Offer.find({ isActive: true }).lean()
    ]);

    const totalItems = allCarts.length;
    const skip = (page - 1) * limit;
    const cartsPerPage = allCarts.slice(skip, skip + limit);

    // 2. Reuse the fetched allCarts to calculate totals without re-querying
    const totals = await calculateCartTotals(userId, allCarts, activeOffers);

    const cartItems = cartsPerPage.map(item => {
        const variant = item.variantId;
        const product = variant?.productId;
        const itemPrice = (variant && variant.salePrice) ? variant.salePrice : (variant ? variant.price : 0);

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
            quantity: item.productQuantity || 1,
            stock: variant ? variant.stock : 0,
            outOfStock: !isAvailable
        };
    });

    return {
        ...totals,
        cartItems,
        pagination: {
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit) || 1,
            totalItems,
            hasNextPage: page < (Math.ceil(totalItems / limit) || 1),
            hasPrevPage: page > 1,
            limit
        }
    };
}


export async function addItemToCart(userId, variantId) {
    const cartLimit = 6;
    const variant = await ProductVariant.findById(variantId).populate('productId').lean();
    if (!variant) throw new Error("Product variant not found");

    if (variant.stock <= 0 || variant.status !== "Active" || (variant.productId && variant.productId.isBlocked)) {
        throw new Error("This product is currently unavailable");
    }

    const cartItem = await Cart.findOne({ userId, variantId });

    if (cartItem) {
        const newQuantity = (cartItem.productQuantity || 0) + 1;
        if (variant.stock < newQuantity) throw new Error(`Only ${variant.stock} in stock.`);
        if (newQuantity > cartLimit) throw new Error(`Max ${cartLimit} units per item.`);

        cartItem.productQuantity = newQuantity;
        await cartItem.save();
    } else {
        await Cart.create({ userId, variantId, productQuantity: 1 });
    }

    return Cart.countDocuments({ userId });
}


export async function updateItemQuantity(userId, variantId, quantity) {
    const quantityLimit = 6;
    if (quantity < 1) throw new Error("Min quantity is 1");
    if (quantity > quantityLimit) throw new Error(`Max quantity is ${quantityLimit}`);

    // Parallelize availability check and offer fetching
    const [variant, activeOffers] = await Promise.all([
        ProductVariant.findById(variantId).populate('productId').lean(),
        Offer.find({ isActive: true }).lean()
    ]);

    const isAvailable = variant &&
        variant.stock > 0 &&
        variant.status === "Active" &&
        variant.productId &&
        !variant.productId.isBlocked;

    if (!isAvailable) {
        const totals = await calculateCartTotals(userId, null, activeOffers);
        return { ...totals, outOfStock: true };
    }

    if (variant.stock < quantity) throw new Error(`Only ${variant.stock} units available`);

    // Update and then calculate totals in one combined flow if possible
    await Cart.updateOne({ userId, variantId }, { productQuantity: quantity });

    const totals = await calculateCartTotals(userId, null, activeOffers);
    return { ...totals, outOfStock: false };
}


export async function removeItemFromCart(userId, variantId) {
    await Cart.deleteOne({ userId, variantId });
    return calculateCartTotals(userId);
}
