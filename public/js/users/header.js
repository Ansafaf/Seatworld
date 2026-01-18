function toggleMobileNav() {
    // Implement mobile nav drawer if needed, or redirect to a mobile menu page
    console.log("Mobile menu toggled");
}

/**
 * Updates the cart and wishlist count badges in the header.
 * @param {Object} counts - Object containing cartCount and/or wishlistCount
 */
window.updateHeaderCounts = (counts) => {
    if (!counts) return;

    if (typeof counts.cartCount !== 'undefined') {
        const cartBadge = document.querySelector('.cart-count-badge');
        if (cartBadge) {
            cartBadge.textContent = counts.cartCount;
            cartBadge.style.display = counts.cartCount > 0 ? 'flex' : 'none';
        }
    }

    if (typeof counts.wishlistCount !== 'undefined') {
        const wishlistBadge = document.querySelector('.wishlist-count-badge');
        if (wishlistBadge) {
            wishlistBadge.textContent = counts.wishlistCount;
            wishlistBadge.style.display = counts.wishlistCount > 0 ? 'flex' : 'none';
        }
    }
};

// Initial sync on page load
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/user/counts');
        if (response.ok) {
            const counts = await response.json();
            window.updateHeaderCounts(counts);
        }
    } catch (err) {
        console.error("Failed to sync header counts:", err);
    }
});
