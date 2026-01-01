import { apiRequest } from '../utils/fetchClient.js';

// Mobile Menu Toggle
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const mobileSidebar = document.getElementById('mobileSidebar');
const sidebarOverlay = document.getElementById('sidebarOverlay');
const body = document.body;

function openMobileSidebar() {
    if (!mobileMenuBtn || !mobileSidebar || !sidebarOverlay) return;
    mobileMenuBtn.classList.add('active');
    mobileSidebar.classList.add('active');
    sidebarOverlay.classList.add('active');
    body.classList.add('sidebar-open');
}

function closeMobileSidebar() {
    if (!mobileMenuBtn || !mobileSidebar || !sidebarOverlay) return;
    mobileMenuBtn.classList.remove('active');
    mobileSidebar.classList.remove('active');
    sidebarOverlay.classList.remove('active');
    body.classList.remove('sidebar-open');
}

function toggleMobileSidebar() {
    if (!mobileSidebar) return; // Add null check
    if (mobileSidebar.classList.contains('active')) {
        closeMobileSidebar();
    } else {
        openMobileSidebar();
    }
}

// Event Listeners
if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', toggleMobileSidebar);
if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeMobileSidebar);
if (sidebarOverlay) sidebarOverlay.addEventListener('click', closeMobileSidebar);

// Close sidebar when clicking menu items on mobile
const mobileMenuItems = document.querySelectorAll('.mobile-sidebar .menu-item');
mobileMenuItems.forEach(item => {
    item.addEventListener('click', closeMobileSidebar);
});

// Close sidebar with Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeMobileSidebar();
    }
});

// Close sidebar on window resize to desktop
window.addEventListener('resize', () => {
    if (window.innerWidth > 968) {
        closeMobileSidebar();
    }
});

// Form validation feedback
const form = document.querySelector('form');
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
