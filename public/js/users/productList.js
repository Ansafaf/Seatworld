// Price Range Sync
const minRange = document.getElementById('minRange');
const maxRange = document.getElementById('maxRange');
const minInput = document.getElementById('minPriceInput');
const maxInput = document.getElementById('maxPriceInput');
const progress = document.getElementById('priceProgress');

function updateSlider() {
    if (!minRange) return;
    const min = parseInt(minRange.min);
    const max = parseInt(minRange.max);
    const minVal = parseInt(minRange.value);
    const maxVal = parseInt(maxRange.value);

    if (maxVal - minVal < 100) {
        if (event && event.target === minRange) minRange.value = maxVal - 100;
        else if (event && event.target === maxRange) maxRange.value = minVal + 100;
    }

    const cMin = parseInt(minRange.value);
    const cMax = parseInt(maxRange.value);

    minInput.value = cMin;
    maxInput.value = cMax;

    const p1 = ((cMin - min) / (max - min)) * 100;
    const p2 = ((cMax - min) / (max - min)) * 100;

    progress.style.left = p1 + '%';
    progress.style.width = (p2 - p1) + '%';
}

if (minRange) {
    minRange.addEventListener('input', updateSlider);
    maxRange.addEventListener('input', updateSlider);
    minInput.addEventListener('change', () => { minRange.value = minInput.value; updateSlider(); });
    maxInput.addEventListener('change', () => { maxRange.value = maxInput.value; updateSlider(); });
    updateSlider();
}

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
if (filterForm) {
    const sortSelect = filterForm.querySelector('.sort-select');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            filterForm.submit();
        });
    }
}
// Handle filter removal
document.addEventListener('click', (e) => {
    const removeSearchBtn = e.target.closest('#removeSearchBtn');
    const removeSortBtn = e.target.closest('#removeSortBtn');

    if (removeSearchBtn) {
        if (headerSearchInput) headerSearchInput.value = '';
        if (hiddenSearchInput) hiddenSearchInput.value = '';
        if (filterForm) filterForm.submit();
    }

    if (removeSortBtn) {
        if (filterForm) {
            const sortSelect = filterForm.querySelector('.sort-select');
            if (sortSelect) {
                sortSelect.value = 'featured';
                filterForm.submit();
            }
        }
    }
});
