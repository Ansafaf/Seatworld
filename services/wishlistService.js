import Wishlist from "../models/wishlistModel.js";

export const toggleWishlist = async (userId, variantId) => {
    const existing = await Wishlist.findOne({ userId, variantId });
    if (existing) {
        await Wishlist.deleteOne({ userId, variantId });
        return { action: "removed" };
    }
    await Wishlist.create({ userId, variantId });
    return { action: 'added' };
};

export const getWishlist = async (userId) => {
    return Wishlist.find({ userId: userId })
        .populate({
            path: "variantId",
            populate: {
                path: "productId",
                select: "name brand"
            },
            select: "productId price color stock images"
        })
        .sort({ createdAt: -1 });
};

export const removeFromWishlist = async (userId, variantId) => {
    await Wishlist.deleteOne({ userId, variantId });
};