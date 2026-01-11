import { apiRequest } from '../utils/fetchClient.js';

// Sidebar toggle for mobile
function toggleSidebar() {
    const sidebar = document.querySelector('.sidebar');
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
        if (window.innerWidth <= 968) {
            toggleSidebar();
        }
    });
});

// Form validation feedback
const form = document.getElementById('addressAddForm');
const inputs = form ? form.querySelectorAll('.form-input') : [];

inputs.forEach(input => {
    // Add focus styles
    input.addEventListener('focus', function () {
        this.parentElement.classList.add('focused');
    });

    input.addEventListener('blur', function () {
        this.parentElement.classList.remove('focused');
        if (this.value.trim() !== '') {
            this.classList.add('has-value');
        } else {
            this.classList.remove('has-value');
        }
    });

    // Real-time validation for pincode and mobile
    if (input.type === 'tel' || input.id === 'pincode') {
        input.addEventListener('input', function () {
            const value = this.value.replace(/\D/g, '');
            this.value = value;

            if (input.id === 'pincode' && value.length > 6) {
                this.value = value.slice(0, 6);
            } else if (input.id === 'mobile' && value.length > 10) {
                this.value = value.slice(0, 10);
            }
        });
    }
});

// Handle form submission
if (form) {
    form.addEventListener('submit', async function (e) {
        e.preventDefault();

        const pincode = document.getElementById('pincode');
        const mobile = document.getElementById('mobile');

        if (pincode && pincode.value.length !== 6) {
            pincode.focus();
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please enter a valid 6-digit pincode',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        if (mobile && mobile.value.length !== 10) {
            mobile.focus();
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Please enter a valid 10-digit mobile number',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        // Show loading state
        const submitBtn = form.querySelector('.btn-save');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.textContent = 'Saving...';
            submitBtn.disabled = true;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        try {
            const result = await apiRequest(form.action, 'POST', data);

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
                    text: result.message || 'Failed to save address',
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
