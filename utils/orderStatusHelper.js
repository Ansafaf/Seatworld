/**
 * Calculates the overall status of an order based on its individual item statuses.
 * @param {Array} items - Array of order item objects.
 * @returns {string} - The derived order-level status.
 */
export const calculateDerivedStatus = (items) => {
    if (!items || items.length === 0) return "Pending";

    const itemStatuses = items.map(i => i.status);
    const totalItems = items.length;
    const deliveredCount = items.filter(i => i.status === 'delivered').length;
    const returnedCount = items.filter(i => i.status === 'returned').length;
    const cancelledCount = items.filter(i => i.status === 'cancelled').length;

    if (returnedCount === totalItems) return "Returned";
    if (returnedCount > 0) return "Partially Returned";
    if (deliveredCount === totalItems) return "Delivered";
    if (deliveredCount > 0) return "Partially Delivered";
    if (cancelledCount === totalItems) return "Cancelled";
    if (cancelledCount > 0) return "Partially Cancelled";

    // If all items have the same status (e.g., all Shipped), use that status
    if (new Set(itemStatuses).size === 1) {
        return itemStatuses[0];
    }

    // Priority for Shipped if at least one item is shipped
    if (items.some(i => i.status === 'shipped')) {
        return "Shipped";
    }

    // Default to the status of the first item (or "Pending" fallback)
    return items[0]?.status || "Pending";
};
