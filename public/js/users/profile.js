// Mobile sidebar functionality
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const mobileSidebar = document.getElementById('mobileSidebar');
const mobileOverlay = document.getElementById('mobileOverlay');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');

function openMobileSidebar() {
    if (!mobileSidebar || !mobileOverlay) return;
    mobileSidebar.classList.add('active');
    mobileOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeMobileSidebar() {
    if (!mobileSidebar || !mobileOverlay) return;
    mobileSidebar.classList.remove('active');
    mobileOverlay.classList.remove('active');
    document.body.style.overflow = 'auto';
}

// Event listeners for mobile menu
if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', openMobileSidebar);
if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', closeMobileSidebar);
if (mobileOverlay) mobileOverlay.addEventListener('click', closeMobileSidebar);

// Close sidebar when clicking on menu items
const mobileMenuItems = document.querySelectorAll('#mobileSidebar .menu-item');
mobileMenuItems.forEach(item => {
    item.addEventListener('click', closeMobileSidebar);
});

// Close sidebar on escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mobileSidebar && mobileSidebar.classList.contains('active')) {
        closeMobileSidebar();
    }
});

// Responsive adjustments on window resize
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && mobileSidebar && mobileSidebar.classList.contains('active')) {
        closeMobileSidebar();
    }
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
