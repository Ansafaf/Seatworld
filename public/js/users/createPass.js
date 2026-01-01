import { apiRequest } from '../utils/fetchClient.js';

const form = document.getElementById('passwordForm');
const newPasswordInput = document.getElementById('newPassword');
const confirmPasswordInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('submitBtn');
const newPasswordError = document.getElementById('newPasswordError');
const confirmPasswordError = document.getElementById('confirmPasswordError');

function validateForm() {
    if (!newPasswordInput || !confirmPasswordInput || !submitBtn) return false;

    const newPassword = newPasswordInput.value;
    const confirmPassword = confirmPasswordInput.value;
    let isValid = true;

    // Reset errors
    newPasswordInput.classList.remove('error');
    confirmPasswordInput.classList.remove('error');
    if (newPasswordError) newPasswordError.classList.remove('show');
    if (confirmPasswordError) confirmPasswordError.classList.remove('show');

    // Validate new password
    if (newPassword.length > 0 && newPassword.length < 8) {
        newPasswordInput.classList.add('error');
        if (newPasswordError) newPasswordError.classList.add('show');
        isValid = false;
    }

    // Validate password match
    if (confirmPassword.length > 0 && newPassword !== confirmPassword) {
        confirmPasswordInput.classList.add('error');
        if (confirmPasswordError) confirmPasswordError.classList.add('show');
        isValid = false;
    }

    // Enable/disable submit button
    if (newPassword.length >= 8 && confirmPassword.length >= 8 && newPassword === confirmPassword) {
        submitBtn.classList.add('active');
        submitBtn.disabled = false;
    } else {
        submitBtn.classList.remove('active');
        submitBtn.disabled = true;
    }

    return isValid;
}

if (newPasswordInput) newPasswordInput.addEventListener('input', validateForm);
if (confirmPasswordInput) confirmPasswordInput.addEventListener('input', validateForm);

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Show loading state
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.textContent = 'Processing...';
            submitBtn.disabled = true;
        }

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
                    window.location.href = result.redirectUrl || '/login';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Failed',
                    text: result.message || 'Failed to create password',
                    confirmButtonColor: '#3b82f6'
                });
                if (submitBtn) {
                    submitBtn.textContent = originalText;
                    submitBtn.disabled = false;
                    validateForm(); // Re-enable if valid
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
                validateForm();
            }
        }
    });
}
