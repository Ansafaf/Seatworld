
(function () {
    const getLimitForScreen = () => {
        const width = window.innerWidth;
        if (width < 640) return 4; // Mobile
        if (width < 1024) return 6; // Tablet
        return 8; // Desktop
    };

    const updatePaginationLinks = () => {
        const limit = getLimitForScreen();
        const urlParams = new URLSearchParams(window.location.search);
        const currentLimit = parseInt(urlParams.get('limit'));

        // If limit is not set or doesn't match screen size, we should probably update links
        // However, we don't want to force-reload the page immediately if the user is browsing.
        // Instead, we ensure all pagination links have the correct limit.
        const paginationLinks = document.querySelectorAll('.pagination-item:not(.disabled)');
        paginationLinks.forEach(link => {
            if (link.tagName === 'A') {
                const linkUrl = new URL(link.href, window.location.origin);
                linkUrl.searchParams.set('limit', limit);
                link.href = linkUrl.pathname + linkUrl.search;
            }
        });

        // Also check if we need to redirect to the first page with the correct limit if items are missing
        // For simplicity, we mostly rely on the backend respecting the limit.
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        updatePaginationLinks();

        // Handle window resize with a debounce
        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const newLimit = getLimitForScreen();
                const urlParams = new URLSearchParams(window.location.search);
                if (parseInt(urlParams.get('limit')) !== newLimit) {
                    // Update current URL and reload to apply new limit
                    urlParams.set('limit', newLimit);
                    urlParams.delete('page'); // Reset to page 1 when limit changes for UX
                    window.location.search = urlParams.toString();
                }
            }, 500);
        });
    });
})();
