import { debounce } from "../utils/debounce.js";
import { blockCategory, unblockCategory } from "../services/categoryService.js";
// Sidebar logic
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

// AJAX logic
let categorySearchTimeout;
const searchInput = document.getElementById('searchInput');
const tableBody = document.getElementById('tableBody');
const paginationContainer = document.getElementById('paginationContainer');

const fetchCategories = async (page = 1, search = '') => {
    try {
        const response = await fetch(`/admin/categories?page=${page}&search=${encodeURIComponent(search)}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' }
        });
        const data = await response.json();

        if (data.success) {
            updateTable(data.categories, data.pagination.currentPage, data.pagination.limit);
            updatePagination(data.pagination.currentPage, data.pagination.totalPages, data.search);
            // Update URL without reload
            const newUrl = `/admin/categories?page=${page}${search ? `&search=${encodeURIComponent(search)}` : ''}`;
            window.history.pushState({ page, search }, '', newUrl);
        }
    } catch (error) {
        console.error('Error fetching categories:', error);
    }
};

const updateTable = (categories, currentPage, limit) => {
    if (!tableBody) return;
    if (categories.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="px-6 py-8 text-center text-gray-500">
                    <div class="flex flex-col items-center justify-center">
                        <span class="material-icons-outlined text-4xl text-gray-300 mb-2">inbox</span>
                        <p>No categories found</p>
                    </div>
                </td>
            </tr>`;
        return;
    }

    tableBody.innerHTML = categories.map((category, index) => `
        <tr data-category-id="${category._id}" class="hover:bg-gray-50 transition-colors">
            <td class="px-6 py-4 text-sm text-gray-500">
                ${(currentPage - 1) * limit + index + 1}
            </td>
            <td class="px-6 py-4">
                <span class="text-sm font-medium text-gray-900">
                    ${category.categoryName || category.name}
                </span>
            </td>
            <td class="px-6 py-4 text-sm text-gray-500">
                ${new Date(category.createdAt).toLocaleDateString('en-GB')}
            </td>
            <td class="px-6 py-4">
                <span class="status-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${category.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
                    ${category.isActive ? 'Active' : 'Inactive'}
                </span>
            </td>
            <td class="px-6 py-4 text-center">
                <div class="flex items-center justify-center gap-2">
                    <a href="/admin/edit-category/${category._id}" class="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors tooltip" title="Edit">
                        <span class="material-icons-outlined text-lg">edit</span>
                    </a>
                    <div class="action-btn-container">
                        ${category.isActive
            ? `<button onclick="openConfirmModal('/admin/block-category/${category._id}', 'block')" class="action-btn p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip" title="Block"><span class="material-icons-outlined text-lg">block</span></button>`
            : `<button onclick="openConfirmModal('/admin/unblock-category/${category._id}', 'unblock')" class="action-btn p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors tooltip" title="Unblock"><span class="material-icons-outlined text-lg">check_circle</span></button>`
        }
                    </div>
                </div>
            </td>
        </tr>
    `).join('');
};

const updatePagination = (currentPage, totalPages, search) => {
    if (!paginationContainer) return;
    if (totalPages <= 0) {
        paginationContainer.innerHTML = '';
        return;
    }

    let html = `
        <div class="text-sm text-gray-500 hidden sm:block">
            Showing page <span class="font-medium" id="currentPageDisplay">${currentPage}</span> of <span class="font-medium" id="totalPagesDisplay">${totalPages}</span>
        </div>
        <div class="flex items-center gap-2 mx-auto sm:mx-0">`;

    if (currentPage > 1) {
        html += `<a href="#" data-page="${currentPage - 1}" class="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors pagination-link"><span class="material-icons-outlined text-sm">chevron_left</span></a>`;
    }

    html += `<div class="flex items-center gap-2 pagination-numbers">`;
    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<span class="w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-sm">${i}</span>`;
        } else {
            html += `<a href="#" data-page="${i}" class="w-8 h-8 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 text-sm transition-colors pagination-link">${i}</a>`;
        }
    }
    html += `</div>`;

    if (currentPage < totalPages) {
        html += `<a href="#" data-page="${currentPage + 1}" class="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors pagination-link"><span class="material-icons-outlined text-sm">chevron_right</span></a>`;
    }

    html += `</div>`;
    paginationContainer.innerHTML = html;

    // Attach listeners
    paginationContainer.querySelectorAll('a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            fetchCategories(parseInt(link.dataset.page), searchInput.value);
        });
    });
};

let searchHandler = (e) => {
    let searchTerm = e.target.value;
    fetchCategories(1, searchTerm);
}
const debouncedSearch = debounce(searchHandler, 400);
if (searchInput) {
    searchInput.addEventListener('input', debouncedSearch);
}

// Initial Pagination Listeners
document.querySelectorAll('.pagination-link').forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        fetchCategories(parseInt(link.dataset.page), searchInput.value);
    });
});

// Modal Logic
const modal = document.getElementById('confirmModal');
const confirmForm = document.getElementById('confirmForm');
const modalTitle = document.getElementById('modalTitle');
const modalMessage = document.getElementById('modalMessage');
const confirmButton = document.getElementById('confirmButton');
const modalIconContainer = document.getElementById('modalIconContainer');
const modalIcon = document.getElementById('modalIcon');

window.openConfirmModal = (actionUrl, actionType) => {
    confirmForm.action = actionUrl;
    confirmForm.dataset.actionType = actionType;

    if (actionType === 'block') {
        modalTitle.textContent = 'Block Category';
        modalMessage.textContent = 'Are you sure you want to block this category? It will not be visible to users.';
        confirmButton.className = 'inline-flex w-full justify-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 sm:ml-3 sm:w-auto';
        confirmButton.textContent = 'Block';
        modalIconContainer.className = 'mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10';
        modalIcon.className = 'material-icons-outlined text-red-600';
        modalIcon.textContent = 'block';
    } else {
        modalTitle.textContent = 'Unblock Category';
        modalMessage.textContent = 'Are you sure you want to unblock this category? It will successfully be visible to users.';
        confirmButton.className = 'inline-flex w-full justify-center rounded-md bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-500 sm:ml-3 sm:w-auto';
        confirmButton.textContent = 'Unblock';
        modalIconContainer.className = 'mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10';
        modalIcon.className = 'material-icons-outlined text-green-600';
        modalIcon.textContent = 'check_circle';
    }

    modal.classList.remove('hidden');
}

window.closeConfirmModal = () => {
    modal.classList.add('hidden');
}

confirmForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const actionUrl = this.action;
    const id = actionUrl.split('/').pop();
    const actionType = this.dataset.actionType;

    try {
        const data = actionType === 'block' ? await blockCategory(id) : await unblockCategory(id);

        if (data && data.success) {
            Swal.fire({ icon: 'success', title: 'Success!', text: data.message, showConfirmButton: false, timer: 1500 });

            const row = document.querySelector(`tr[data-category-id="${id}"]`);
            if (row) {
                const statusBadge = row.querySelector('.status-badge');
                const actionBtnContainer = row.querySelector('.action-btn-container');

                if (actionType === 'block') {
                    statusBadge.textContent = 'Inactive';
                    statusBadge.className = 'status-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800';
                    actionBtnContainer.innerHTML = `<button onclick="openConfirmModal('/admin/unblock-category/${id}', 'unblock')" class="action-btn p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors tooltip" title="Unblock"><span class="material-icons-outlined text-lg">check_circle</span></button>`;
                } else {
                    statusBadge.textContent = 'Active';
                    statusBadge.className = 'status-badge inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800';
                    actionBtnContainer.innerHTML = `<button onclick="openConfirmModal('/admin/block-category/${id}', 'block')" class="action-btn p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors tooltip" title="Block"><span class="material-icons-outlined text-lg">block</span></button>`;
                }
            }
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message || 'Something went wrong' });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'An unexpected error occurred' });
    }
    closeConfirmModal();
});
