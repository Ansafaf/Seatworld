import { debounce } from '/js/utils/debounce.js';

const searchInput = document.getElementById('orderSearch');

if (searchInput) {
    const performSearch = debounce((term) => {
        const url = new URL(window.location.href);
        url.searchParams.set('search', term);
        url.searchParams.set('page', 1); // Reset to first page on search
        window.location.href = url.toString();
    }, 500);

    searchInput.addEventListener('input', (e) => {
        performSearch(e.target.value);
    });

    // Keep cursor at end of input after reload
    searchInput.focus();
    const len = searchInput.value.length;
    searchInput.setSelectionRange(len, len);
}
