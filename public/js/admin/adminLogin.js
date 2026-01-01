document.getElementById('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('error-message');

    try {
        const response = await fetch('/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            window.location.href = data.redirectUrl || '/admin/dashboard';
        } else {
            errorDiv.textContent = data.message || 'Login failed';
            errorDiv.style.display = 'block';
            // Shake effect or visual feedback could be added here
        }
    } catch (error) {
        console.error('Error:', error);
        errorDiv.textContent = 'An unexpected error occurred';
        errorDiv.style.display = 'block';
    }
});
