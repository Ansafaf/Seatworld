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

window.showGoogleEmailWarning = function () {
    Swal.fire({
        icon: 'warning',
        title: 'Access Restricted',
        text: 'Email address cannot be changed because this account was created using Google Sign-In.',
        confirmButtonColor: '#000',
        confirmButtonText: 'Got it'
    });
}

// Handle profile update form submission via AJAX
const profileForm = document.getElementById('personalInfoForm');
if (profileForm) {
    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const formData = new FormData(profileForm);
        const data = Object.fromEntries(formData.entries());

        // Basic client-side validation
        if (!data.name || data.name.trim().length === 0) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Name cannot be empty',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        // Show loading state
        const submitBtn = profileForm.querySelector('.update-btn');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.textContent = 'Updating...';
            submitBtn.disabled = true;
        }

        try {
            const result = await apiRequest(profileForm.action, 'POST', data);

            if (result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: result.message,
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    if (!result.noChange && result.redirectUrl) {
                        window.location.href = result.redirectUrl;
                    } else if (submitBtn) {
                        submitBtn.textContent = originalText;
                        submitBtn.disabled = false;
                    }
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed',
                    text: result.message || 'Failed to update profile',
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
