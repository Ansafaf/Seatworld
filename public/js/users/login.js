import { apiRequest } from '../utils/fetchClient.js';

const loginForm = document.querySelector('.login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn ? submitBtn.textContent : '';
        if (submitBtn) {
            submitBtn.textContent = 'Logging in...';
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
                    window.location.href = result.redirectUrl || '/home';
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Login Failed',
                    text: result.message || 'Invalid email or password',
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
