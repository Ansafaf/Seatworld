import { debounce } from '/js/utils/debounce.js';

const searchInput = document.getElementById('adminOrderSearch');
const statusFilter = document.getElementById('statusFilter');
const sortOption = document.getElementById('sortOption');
const paymentFilter = document.getElementById('paymentFilter');

function updateFilters() {
    const search = searchInput.value;
    const status = statusFilter.value;
    const sort = sortOption.value;
    const paymentMethod = paymentFilter ? paymentFilter.value : "";

    const url = new URL(window.location.href);
    url.searchParams.set('search', search);
    url.searchParams.set('status', status);
    url.searchParams.set('sort', sort);
    url.searchParams.set('paymentMethod', paymentMethod);
    url.searchParams.set('page', 1); // Reset to first page

    window.location.href = url.toString();
}

const debouncedSearch = debounce(updateFilters, 500);

if (searchInput) {
    searchInput.addEventListener('input', debouncedSearch);
    // Maintain focus for search
    if (searchInput.value) {
        searchInput.focus();
        const len = searchInput.value.length;
        searchInput.setSelectionRange(len, len);
    }
}

if (statusFilter) {
    statusFilter.addEventListener('change', updateFilters);
}

if (sortOption) {
    sortOption.addEventListener('change', updateFilters);
}

if (paymentFilter) {
    paymentFilter.addEventListener('change', updateFilters);
}