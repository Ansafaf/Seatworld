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

// Handle email update form submission via AJAX
const emailForm = document.querySelector('form');
if (emailForm) {
    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(emailForm);
        const data = Object.fromEntries(formData.entries());

        // Basic client-side validation
        if (data.newEmail !== data.confirmEmail) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Emails do not match',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        // Show loading state
        const submitBtn = emailForm.querySelector('.verify-btn');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.textContent = 'Processing...';
            submitBtn.disabled = true;
        }

        try {
            const result = await apiRequest(emailForm.action, 'POST', data);

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: result.message,
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.href = result.redirectUrl || '/email/change-otp';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed',
                    text: result.message || 'Failed to process email update',
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
