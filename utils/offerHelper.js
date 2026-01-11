/**
 * Computes the best active offer for a given product by comparing product-specific offers 
 * and category-level offers.
 * 
 * @param {Object} product - The product object (should have _id and categoryId).
 * @param {Array} activeOffers - Array of all currently active offer documents.
 * @returns {Object|null} - The offer object with the highest discount percentage, or null if none found.
 */
export const getBestOffer = (product, activeOffers) => {
    if (!activeOffers || activeOffers.length === 0) return null;

    const productId = product._id?.toString();
    const categoryId = product.categoryId?._id?.toString() || product.categoryId?.toString();

    const applicableOffers = activeOffers.filter(offer => {
        if (!offer.isActive) return false;
        if (offer.offerType === 'Product' && offer.productId?.toString() === productId) return true;
        if (offer.offerType === 'Category' && offer.categoryId?.toString() === categoryId) return true;
        return false;
    });

    if (applicableOffers.length === 0) return null;

    // Return the offer with the highest discount percentage
    return applicableOffers.reduce((max, offer) =>
        (offer.discountPercentage > max.discountPercentage) ? offer : max
        , applicableOffers[0]);
};

/**
 * Enriches a product or variant object with discount calculations.
 * 
 * @param {Object} item - The product or variant object.
 * @param {Number} originalPrice - The base/original price of the item.
 * @param {Array} activeOffers - Array of active offers.
 * @returns {Object} - Object containing discountedPrice, hasOffer, and discountPercentage.
 */
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
