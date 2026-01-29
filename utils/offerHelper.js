
export const getBestOffer = (product, activeOffers) => {
    if (!activeOffers || activeOffers.length === 0) return null;

    const productId = product._id?.toString();
    const categoryId = product.categoryId?._id?.toString() || product.categoryId?.toString()

    // Filter for applicable offers: both Product-specific and Category-based offers
    const applicableOffers = activeOffers.filter(offer => {
        if (!offer.isActive) return false;

        // Check if offer is for this specific product
        if (offer.offerType === 'Product' && offer.productId?.toString() === productId) return true;

        // Check if offer is for the product's category
        if (offer.offerType === 'Category' && offer.categoryId?.toString() === categoryId) return true;

        return false;
    });

    if (applicableOffers.length === 0) return null;

    return applicableOffers.reduce((max, offer) => {
        return (offer.discountPercentage > max.discountPercentage) ? offer : max;
    });
};


export const calculateDiscount = (item, originalPrice, activeOffers) => {
    const bestOffer = getBestOffer(item, activeOffers);

    if (bestOffer) {
        const discountAmount = (originalPrice * bestOffer.discountPercentage) / 100;
        const discountedPrice = Math.floor(originalPrice - discountAmount);

        return {
            hasOffer: true,
            discountPercentage: bestOffer.discountPercentage,
            discountedPrice,
            originalPrice
        };
    }

    return {
        hasOffer: false,
        discountPercentage: 0,
        discountedPrice: originalPrice,
        originalPrice
    };
};
