
import { apiRequest } from "../utils/fetchClient.js";
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

// Form submission handling
const form = document.getElementById('addCategoryForm');
if (form) {
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const categoryNameInput = document.getElementById('categoryName');
        const categoryName = categoryNameInput.value.trim();
        const nameRegex = /^[a-zA-Z\s]{3,20}$/;
        if (!nameRegex.test(categoryName)) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Category name must be 3-20 characters long and contain only letters.'
            });
            return;
        }

        try {


            const data = await apiRequest("/admin/add-category", "POST", { categoryName });

            if (data && data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: data.message,
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.href = data.redirectUrl || '/admin/categories';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Something went wrong',
                });
            }
        } catch (error) {
            console.error('Error:', error);

            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.data?.message || error.message || 'Something went wrong',
                confirmButtonColor: '#3b82f6'
            });
        }

    });
}
