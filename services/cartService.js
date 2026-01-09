import logger from "../utils/logger.js"
import Cart from "../models/cartModel.js";
import { ProductVariant } from "../models/productModel.js";
import mongoose from "mongoose";


export async function calculateCartTotals(userId) {
    const carts = await Cart.find({ userId }).populate({
        path: 'variantId',
        populate: { path: 'productId' }
    });
    let subtotal = 0;
    const items = [];

    carts.forEach(item => {
        if (item.variantId && item.variantId.stock > 0 && item.variantId.status === "Active" && item.variantId.productId && !item.variantId.productId.isBlocked) {
            const variant = item.variantId;
            const product = variant.productId;
            const price = variant.salePrice || variant.price;
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
                color: variant.color,
                productId: product._id,
                variantId: variant._id
            });
        }
    });

    const deliveryFeeValue = subtotal > 0 && subtotal < 1000 ? 50 : 0;
    const total = subtotal + deliveryFeeValue;

    return {
        items,
        subtotal,
        deliveryFee: deliveryFeeValue === 0 ? "Free" : `₹${deliveryFeeValue}`,
        total,
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
    const removedItemNames = [];
    const validCartIds = [];

    for (const item of allCartsRaw) {
        const variant = item.variantId;
        const product = variant ? variant.productId : null;

        const isAvailable = variant &&
            variant.stock > 0 &&
            variant.status === "Active" &&
            product &&
            !product.isBlocked;

        if (!isAvailable) {
            removedItemNames.push(product ? product.name : "Unknown Product");
            await Cart.findByIdAndDelete(item._id);
        } else {
            validCartIds.push(item._id);
        }
    }

    const totalItems = validCartIds.length;
    const cartsPerPage= await Cart.find({ _id: { $in: validCartIds } })
        .populate({
            path: 'variantId',
            populate: { path: 'productId' }
        })
        .skip(skip)
        .limit(limit)
        .lean();//convert to plain js

    let subtotal = 0;

    const allValidCarts = await Cart.find({ _id: { $in: validCartIds } }).populate('variantId').lean();
    allValidCarts.forEach(item => {
        const variant = item.variantId;
        if (variant) {
            subtotal += (variant.salePrice || variant.price) * (item.productQuantity || 1);
        }
    });

    const cartItems = cartsPerPage.map(item => {
        const variant = item.variantId;
        const product = variant ? variant.productId : null;
        const itemPrice = (variant && variant.salePrice) ? variant.salePrice : (variant ? variant.price : 0);
        const itemQuantity = item.productQuantity || 1;

        return {
            ...item,
            name: product ? product.name : "Unavailable Product",
            image: (variant && variant.images && variant.images.length > 0) ? variant.images[0] : "",
            color: variant ? variant.color : "",
            price: itemPrice,
            quantity: itemQuantity,
            stock: variant ? variant.stock : 0,
            outOfStock: false
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
        removedItemNames,
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
        if(cartLimit < newQuantity){
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
    if (!variant || variant.stock <= 0 || variant.status !== "Active" || (variant.productId && variant.productId.isBlocked)) {
        await Cart.findOneAndDelete({ userId, variantId });
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
