import { debounce } from "../utils/debounce.js";

const sidebar = document.getElementById("adminSidebar");
const mobileMenuBtn = document.getElementById("mobileMenuBtn");
const sidebarOverlay = document.getElementById("sidebarOverlay");

const toggleSidebar = () => {
    const isClosed = sidebar.classList.contains("-translate-x-full");
    if (isClosed) {
        sidebar.classList.remove("-translate-x-full");
        sidebarOverlay.classList.remove("hidden");
        document.body.classList.add("overflow-hidden");
    } else {
        sidebar.classList.add("-translate-x-full");
        sidebarOverlay.classList.add("hidden");
        document.body.classList.remove("overflow-hidden");
    }
};

if (mobileMenuBtn) mobileMenuBtn.addEventListener("click", toggleSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener("click", toggleSidebar);

// Debounce timeout
let searchTimeout;
const searchInput = document.getElementById('searchInput');
const tableBody = document.getElementById('customerTableBody');
const paginationContainer = document.getElementById('paginationContainer');

// Utility to fetch and update data
const fetchCustomers = async (page = 1, search = '') => {
    try {
        const response = await fetch(`/admin/users?page=${page}&search=${encodeURIComponent(search)}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            updateTable(data.users, data.pagination.currentPage, data.pagination.limit);
            updatePagination(data.pagination.currentPage, data.pagination.totalPages, data.search);
            // Update URL without reload
            const newUrl = `/admin/users?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
            window.history.pushState({ page, search }, '', newUrl);
        }
    } catch (error) {
        console.error('Error fetching customers:', error);
    }
};

const updateTable = (users, currentPage, limit) => {
    if (!tableBody) return;
    if (users.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="px-6 py-10 text-center text-gray-500">No customers found.</td></tr>`;
        return;
    }

    tableBody.innerHTML = users.map((user, index) => `
        <tr data-user-id="${user._id}" class="hover:bg-gray-50 transition-colors duration-150 customer-row">
            <td class="px-6 py-4 text-sm font-bold text-gray-900 index-cell">
                ${(currentPage - 1) * limit + index + 1}
            </td>
            <td class="px-6 py-4 text-sm font-bold text-gray-900 name-cell">
                ${user.name || user.username || 'N/A'}
            </td>
            <td class="px-6 py-4 text-sm text-gray-600 email-cell">
                ${user.email || 'N/A'}
            </td>
            <td class="px-6 py-4 text-sm text-gray-600 status-cell">
                <span class="status-badge px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize ${user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${user.status}
                </span>
            </td>
            <td class="px-6 py-4 text-sm action-cell">
                <div class="flex items-center gap-2 action-btn-container">
                    ${user.status === 'blocked'
            ? `<button onclick="handleAction('/admin/users/${user._id}/unblock', 'unblock')" class="action-btn inline-flex items-center justify-center px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors duration-200">Unblock</button>`
            : `<button onclick="handleAction('/admin/users/${user._id}/block', 'block')" class="action-btn inline-flex items-center justify-center px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors duration-200">Block</button>`
        }
                </div>
            </td>
        </tr>
    `).join('');
};

const updatePagination = (currentPage, totalPages, search) => {
    if (!paginationContainer || totalPages <= 1) {
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    let html = `<div class="pagination-bar">`;

    // Prev Button
    if (currentPage > 1) {
        html += `<a href="#" data-page="${currentPage - 1}" class="pagination-nav-link"><span class="material-icons-outlined">arrow_back</span><span>Prev</span></a>`;
    } else {
        html += `<span class="pagination-nav-link disabled"><span class="material-icons-outlined">arrow_back</span><span>Prev</span></span>`;
    }

    html += `<div class="pagination-numbers">`;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    if (currentPage <= 3) { startPage = 1; endPage = Math.min(totalPages, 5); }
    else if (currentPage >= totalPages - 2) { startPage = Math.max(1, totalPages - 4); endPage = totalPages; }

    if (startPage > 1) {
        html += `<a href="#" data-page="1" class="pagination-number">1</a>`;
        if (startPage > 2) html += `<span class="pagination-dots">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        html += `<a href="#" data-page="${i}" class="pagination-number ${i === currentPage ? 'active' : ''}">${i}</a>`;
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) html += `<span class="pagination-dots">...</span>`;
        html += `<a href="#" data-page="${totalPages}" class="pagination-number">${totalPages}</a>`;
    }

    html += `</div>`; // end pagination-numbers

    // Next Button
    if (currentPage < totalPages) {
        html += `<a href="#" data-page="${currentPage + 1}" class="pagination-nav-link"><span>Next</span><span class="material-icons-outlined">arrow_forward</span></a>`;
    } else {
        html += `<span class="pagination-nav-link disabled"><span>Next</span><span class="material-icons-outlined">arrow_forward</span></span>`;
    }

    html += `</div>`;
    paginationContainer.innerHTML = html;

    // Attach listeners to new links
    paginationContainer.querySelectorAll('a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            fetchCustomers(parseInt(link.dataset.page), searchInput.value);
        });
    });
};

// Initial Pagination Listeners
document.querySelectorAll('.pagination-link, .pagination-nav-link, .pagination-number').forEach(link => {
    link.addEventListener('click', (e) => {
        if (link.classList.contains('disabled')) return;
        const page = new URLSearchParams(link.getAttribute('href').split('?')[1]).get('page');
        if (page) {
            e.preventDefault();
            fetchCustomers(parseInt(page), searchInput.value);
        }
    });
});


let searchHandler = (e) => {
    let searchTerm = e.target.value;
    fetchCustomers(1, searchTerm);
}
const debouncedSearch = debounce(searchHandler, 400);
if (searchInput) {
    searchInput.addEventListener('input', debouncedSearch);
}

window.handleAction = (url, action) => {
    const isBlocking = action === 'block';
    const title = isBlocking ? 'Block User?' : 'Unblock User?';
    const text = isBlocking
        ? "Are you sure you want to block this user? They won't be able to login."
        : "Are you sure you want to unblock this user?";
    const confirmBtnColor = isBlocking ? '#B91C1C' : '#008000';

    Swal.fire({
        title: title,
        text: text,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: confirmBtnColor,
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, proceed!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    Swal.fire({ icon: 'success', title: 'Success', text: data.message, showConfirmButton: false, timer: 1500 });

                    const userId = url.split('/')[3];
                    const row = document.querySelector(`tr[data-user-id="${userId}"]`);
                    if (row) {
                        const statusCell = row.querySelector('.status-cell');
                        const actionBtnContainer = row.querySelector('.action-btn-container');

                        if (isBlocking) {
                            statusCell.innerHTML = `<span class="status-badge px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize bg-red-100 text-red-800">blocked</span>`;
                            actionBtnContainer.innerHTML = `<button onclick="handleAction('/admin/users/${userId}/unblock', 'unblock')" class="action-btn inline-flex items-center justify-center px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded transition-colors duration-200">Unblock</button>`;
                        } else {
                            statusCell.innerHTML = `<span class="status-badge px-2 inline-flex text-xs leading-5 font-semibold rounded-full capitalize bg-green-100 text-green-800">active</span>`;
                            actionBtnContainer.innerHTML = `<button onclick="handleAction('/admin/users/${userId}/block', 'block')" class="action-btn inline-flex items-center justify-center px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded transition-colors duration-200">Block</button>`;
                        }
                    }
                } else {
                    Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Something went wrong' });
                }
            } catch (error) {
                console.error('Error:', error);
                Swal.fire({ icon: 'error', title: 'Error', text: 'An unexpected error occurred' });
            }
        }
    })
}
