// Search Debouncing & Auto-submit
const filterForm = document.getElementById('productFilters');
const headerSearchInput = document.getElementById('headerSearchInput');
const hiddenSearchInput = filterForm ? filterForm.querySelector('input[name="search"]') : null;

function debounce(func, timeout = 500) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}

const handleSearch = debounce(() => {
    if (filterForm) {
        if (hiddenSearchInput && headerSearchInput) {
            hiddenSearchInput.value = headerSearchInput.value;
        }
        filterForm.submit();
    }
});

if (headerSearchInput) {
    headerSearchInput.addEventListener('input', handleSearch);
    // Prevent form submission if it's inside another form or has its own action
    const headerForm = headerSearchInput.closest('form');
    if (headerForm) {
        headerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSearch();
        });
    }
}

// Auto-submit only on sort change (Sorting is an immediate action)
// The sort select has form="productFilters" so it's associated with the form even if not inside it
const sortSelect = document.querySelector('.sort-select');
if (sortSelect && filterForm) {
    sortSelect.addEventListener('change', () => {
        filterForm.submit();
    });
}
// Handle filter removal
document.addEventListener('click', (e) => {
    const removeSearchBtn = e.target.closest('#removeSearchBtn');
    const removeSortBtn = e.target.closest('#removeSortBtn');

    if (removeSearchBtn) {
        e.preventDefault();
        e.stopPropagation();
        if (headerSearchInput) headerSearchInput.value = '';
        if (hiddenSearchInput) hiddenSearchInput.value = '';
        if (filterForm) filterForm.submit();
    }

    if (removeSortBtn) {
        e.preventDefault();
        e.stopPropagation();

        // Build URL with all current filters except sort
        const currentUrl = new URL(window.location.href);
        const params = new URLSearchParams(currentUrl.search);

        // Remove sort parameter
        params.delete('sort');

        // Navigate to the new URL
        const newUrl = params.toString() ? `${currentUrl.pathname}?${params.toString()}` : currentUrl.pathname;
        window.location.href = newUrl;
    }
});
