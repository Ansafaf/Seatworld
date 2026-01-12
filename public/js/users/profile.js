// Sidebar toggle for mobile
function toggleSidebar() {
    const sidebar = document.getElementById('mobileSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.toggle('active');
    if (overlay) overlay.classList.toggle('active');
}

// Attach to window for HTML event handlers
window.toggleSidebar = toggleSidebar;

// Close sidebar when clicking menu items
const mobileMenuItems = document.querySelectorAll('#mobileSidebar .menu-item');
mobileMenuItems.forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 768) {
            toggleSidebar();
        }
    });
});

// Avatar upload handling
const avatarInputs = document.querySelectorAll('input[name="avatar"]');
avatarInputs.forEach(input => {
    input.addEventListener('change', async function (e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            Swal.fire({
                icon: 'error',
                title: 'Invalid File',
                text: 'Please select an image file',
                confirmButtonColor: '#3b82f6'
            });
            e.target.value = '';
            return;
        }

        // Validate file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            Swal.fire({
                icon: 'error',
                title: 'File Too Large',
                text: 'Image must be less than 5MB',
                confirmButtonColor: '#3b82f6'
            });
            e.target.value = '';
            return;
        }

        // Show loading
        Swal.fire({
            title: 'Uploading...',
            text: 'Please wait while we update your profile picture',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // Create FormData and upload
        const formData = new FormData();
        formData.append('avatar', file);

        try {
            const response = await fetch('/profile/avatar', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok && result.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: result.message,
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    // Update all avatar images on the page
                    const avatarImages = document.querySelectorAll('.avatar img');
                    avatarImages.forEach(img => {
                        img.src = result.avatarUrl;
                    });
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Upload Failed',
                    text: result.message || 'Failed to update profile picture',
                    confirmButtonColor: '#3b82f6'
                });
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Something went wrong. Please try again later.',
                confirmButtonColor: '#3b82f6'
            });
        }

        // Reset input
        e.target.value = '';
    });
});

// Referral Modal Functions
function showReferralModal() {
    const modal = document.getElementById('referralModal');
    const overlay = document.getElementById('referralModalOverlay');
    if (modal) modal.classList.add('active');
    if (overlay) overlay.classList.add('active');
}

function hideReferralModal() {
    const modal = document.getElementById('referralModal');
    const overlay = document.getElementById('referralModalOverlay');
    if (modal) modal.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
}

// Close referral modal when clicking overlay
const referralOverlay = document.getElementById('referralModalOverlay');
if (referralOverlay) {
    referralOverlay.addEventListener('click', hideReferralModal);
}

function copyReferralCode() {
    const codeText = document.getElementById('referralCodeText').innerText;

    if (!navigator.clipboard) {
        // Fallback for older browsers
        const tempInput = document.createElement('input');
        tempInput.value = codeText;
        document.body.appendChild(tempInput);
        tempInput.select();
        document.execCommand('copy');
        document.body.removeChild(tempInput);

        Swal.fire({
            icon: 'success',
            title: 'Copied!',
            text: 'Referral code copied to clipboard',
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }

    navigator.clipboard.writeText(codeText)
        .then(() => {
            Swal.fire({
                icon: 'success',
                title: 'Copied!',
                text: 'Referral code copied to clipboard',
                timer: 1500,
                showConfirmButton: false
            });
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Failed to copy referral code',
            });
        });
}

// Attach to window object to make them globally accessible
window.showReferralModal = showReferralModal;
window.hideReferralModal = hideReferralModal;
window.copyReferralCode = copyReferralCode;
