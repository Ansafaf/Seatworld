import { apiRequest } from '../utils/fetchClient.js';

// Sidebar toggle for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

// Attach to window for HTML event handlers
window.toggleSidebar = toggleSidebar;

// Close sidebar when clicking menu items
const sidebarLinks = document.querySelectorAll('.sidebar a');
sidebarLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (window.innerWidth <= 900) {
            toggleSidebar();
        }
    });
});

// Handle address edit form submission via AJAX
const editForm = document.getElementById('editAddressForm');
if (editForm) {
    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(editForm);
        const data = Object.fromEntries(formData.entries());

        // Basic client-side validation for pincode and mobile
        if (data.pincode && !/^\d{6}$/.test(data.pincode)) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please enter a valid 6-digit pincode',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        if (data.mobile && !/^\d{10}$/.test(data.mobile)) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please enter a valid 10-digit mobile number',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        // Show loading state
        const submitBtn = editForm.querySelector('.save-btn');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.textContent = 'Saving...';
            submitBtn.disabled = true;
        }

        try {
            const result = await apiRequest(editForm.action, 'POST', data);

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: result.message,
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.href = result.redirectUrl || '/address';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed',
                    text: result.message || 'Failed to update address',
                    confirmButtonColor: '#3b82f6'
                });
                if (submitBtn) {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                }
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message || 'Something went wrong. Please try again later.',
                confirmButtonColor: '#3b82f6'
            });
            if (submitBtn) {
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            }
        }
    });
}
