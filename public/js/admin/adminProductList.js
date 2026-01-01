let searchTimeout;
const searchInput = document.getElementById('productSearch');
const tableBody = document.getElementById('productTableBody');
const paginationContainer = document.getElementById('paginationContainer');

const fetchProducts = async (page = 1, search = '') => {
    try {
        const response = await fetch(`/admin/products?page=${page}&search=${encodeURIComponent(search)}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            updateTable(data.products, data.currentPage, data.limit);
            updatePagination(data.currentPage, data.totalPages, data.search);
            const newUrl = `/admin/products?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
            window.history.pushState({ page, search }, '', newUrl);
        }
    } catch (error) {
        console.error('Error fetching products:', error);
    }
};

const updateTable = (products, currentPage, limit) => {
    if (!tableBody) return;
    if (products.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-gray-500">No products found matching your criteria.</td></tr>`;
        return;
    }

    tableBody.innerHTML = products.map(p => `
        <tr data-product-id="${p._id}" class="hover:bg-gray-50 transition-colors duration-150">
            <td class="px-6 py-4 text-sm font-bold text-gray-900">${p.name}</td>
            <td class="px-6 py-4 text-sm font-bold text-red-600">₹${Number(p.Baseprice).toFixed(0)}</td>
            <td class="px-6 py-4">
                <span class="inline-block px-4 py-1 text-sm font-bold text-gray-800 border border-gray-400 rounded bg-white">
                    ${p.totalStock}
                </span>
            </td>
            <td class="px-6 py-4 text-sm font-bold text-gray-900">${p.brand}</td>
            <td class="px-6 py-4 text-sm flex items-center gap-3">
                <div class="flex items-center gap-2">
                    <span class="status-badge px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${p.isBlocked ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}">
                        ${p.isBlocked ? 'Blocked' : 'Active'}
                    </span>
                </div>
                <a href="/admin/edit-product/${p._id}" class="inline-flex items-center justify-center px-6 py-1.5 bg-[#008000] hover:bg-green-800 text-white text-xs font-bold rounded transition-colors duration-200">Edit</a>
                <div class="action-btn-container">
                    ${p.isBlocked
            ? `<button onclick="toggleProductStatus('${p._id}', '${p.name}', 'unblock')" class="action-btn inline-flex items-center px-6 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors duration-200">Unblock</button>`
            : `<button onclick="toggleProductStatus('${p._id}', '${p.name}', 'block')" class="action-btn inline-flex items-center px-6 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors duration-200">Block</button>`
        }
                </div>
            </td>
        </tr>
    `).join('');
};

const updatePagination = (currentPage, totalPages, search) => {
    if (!paginationContainer) return;
    if (totalPages <= 1) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = `<div class="pagination-container"><div class="pagination-bar">`;

    // Previous Button
    if (currentPage > 1) {
        html += `<a href="#" data-page="${currentPage - 1}" class="pagination-nav-link pagination-link"><span class="material-icons-outlined">arrow_back</span><span>Prev</span></a>`;
    } else {
        html += `<span class="pagination-nav-link disabled"><span class="material-icons-outlined">arrow_back</span><span>Prev</span></span>`;
    }

    html += `<div class="pagination-numbers">`;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    if (currentPage <= 3) { startPage = 1; endPage = Math.min(totalPages, 5); }
    else if (currentPage >= totalPages - 2) { startPage = Math.max(1, totalPages - 4); endPage = totalPages; }

    if (startPage > 1) {
        html += `<a href="#" data-page="1" class="pagination-number pagination-link">1</a>`;
        if (startPage > 2) html += `<span class="pagination-dots">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<a href="#" data-page="${i}" class="pagination-number pagination-link ${i === currentPage ? 'active' : ''}">${i}</a>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="pagination-dots">...</span>`;
        html += `<a href="#" data-page="${totalPages}" class="pagination-number pagination-link">${totalPages}</a>`;
    }
    html += `</div>`;

    // Next Button
    if (currentPage < totalPages) {
        html += `<a href="#" data-page="${currentPage + 1}" class="pagination-nav-link pagination-link"><span>Next</span><span class="material-icons-outlined">arrow_forward</span></a>`;
    } else {
        html += `<span class="pagination-nav-link disabled"><span>Next</span><span class="material-icons-outlined">arrow_forward</span></span>`;
    }

    html += `</div></div>`;
    paginationContainer.innerHTML = html;

    // Attach listeners
    paginationContainer.querySelectorAll('a.pagination-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            fetchProducts(parseInt(link.dataset.page), searchInput.value);
        });
    });
};

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value;
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            fetchProducts(1, searchTerm);
        }, 800);
    });
}

// Initial Pagination Listeners
document.querySelectorAll('.pagination-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        fetchProducts(parseInt(link.dataset.page), searchInput.value);
    });
});

window.toggleProductStatus = (productId, productName, action) => {
    const isBlocking = action === 'block';
    const title = isBlocking ? `Block "${productName}"?` : `Unblock "${productName}"?`;
    const text = isBlocking ? "Users won't be able to see this product in the store." : "This product will be visible to users again.";
    const confirmButtonText = isBlocking ? 'Yes, block it!' : 'Yes, unblock it!';
    const confirmButtonColor = isBlocking ? '#B91C1C' : '#008000';

    Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: confirmButtonColor,
        cancelButtonColor: '#3085d6',
        confirmButtonText: confirmButtonText
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`/admin/${action}-product/${productId}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
                });
                const data = await response.json();

                if (data.success || data.message) {
                    Swal.fire(isBlocking ? 'Blocked!' : 'Unblocked!', data.message || `Product ${action}ed successfully`, 'success');

                    const row = document.querySelector(`tr[data-product-id="${productId}"]`);
                    if (row) {
                        const statusBadge = row.querySelector('.status-badge');
                        const actionBtnContainer = row.querySelector('.action-btn-container');

                        if (isBlocking) {
                            statusBadge.textContent = 'Blocked';
                            statusBadge.className = 'status-badge px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800';
                            actionBtnContainer.innerHTML = `<button onclick="toggleProductStatus('${productId}', '${productName}', 'unblock')" class="action-btn inline-flex items-center px-6 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors duration-200">Unblock</button>`;
                        } else {
                            statusBadge.textContent = 'Active';
                            statusBadge.className = 'status-badge px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800';
                            actionBtnContainer.innerHTML = `<button onclick="toggleProductStatus('${productId}', '${productName}', 'block')" class="action-btn inline-flex items-center px-6 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors duration-200">Block</button>`;
                        }
                    }
                } else {
                    throw new Error(data.message || 'Something went wrong');
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire('Error!', error.message || 'Something went wrong while processing your request.', 'error');
            }
        }
    });
};
