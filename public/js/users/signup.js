import { apiRequest } from '../utils/fetchClient.js';

const form = document.getElementById('signupForm');
const password = document.getElementById('password');
const confirmPassword = document.getElementById('confirmPassword');

if (form) {
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const usernameInput = form.querySelector('input[name="username"]');
        const emailInput = form.querySelector('input[name="email"]');
        const usernameValue = usernameInput ? usernameInput.value.trim() : '';
        const emailValue = emailInput ? emailInput.value.trim() : '';
        const passwordValue = password.value.trim();
        const confirmPasswordValue = confirmPassword.value.trim();

        if (!usernameValue || !emailValue || !passwordValue) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'All fields are required and cannot be just spaces',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        if (passwordValue !== confirmPasswordValue) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Passwords do not match',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
        if (!usernameRegex.test(usernameValue)) {
            Swal.fire({
                icon: 'error',
                title: 'Validation Error',
                text: 'Username must be 3-20 characters and contain only letters, numbers, and underscores',
                confirmButtonColor: '#3b82f6'
            });
            return;
        }

        const data = {
            username: usernameValue,
            email: emailValue,
            password: passwordValue,
            confirmPassword: confirmPasswordValue,
            referralCode: form.querySelector('input[name="referralCode"]')?.value.trim() || ''
        };

        // Show loading state
        const submitBtn = form.querySelector('.signup-btn');
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
                    window.location.href = result.redirectUrl || '/verify-otp';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Signup Failed',
                    text: result.message || 'Something went wrong',
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
