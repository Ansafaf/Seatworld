import { apiRequest } from '../utils/fetchClient.js';

// Set default address
window.setDefaultAddress = async (addressId) => {
    try {
        const result = await apiRequest(`/address/set-default/${addressId}`, 'POST');

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: result.message,
                showConfirmButton: false,
                timer: 1500
            }).then(() => {
                window.location.reload();
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.message || 'Failed to set default address',
                confirmButtonColor: '#3b82f6'
            });
        }
    } catch (err) {
        console.error(err);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err.message || 'Something went wrong. Please try again later.',
            confirmButtonColor: '#3b82f6'
        });
    }
}

// Delete address
window.openDeleteModal = async (addressId) => {
    const result = await Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3b82f6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
        try {
            const data = await apiRequest(`/address/delete/${addressId}`, 'POST');

            if (data.success) {
                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: data.message,
                    showConfirmButton: false,
                    timer: 1500
                }).then(() => {
                    window.location.reload();
                });
            } else {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: data.message || 'Failed to delete address',
                    confirmButtonColor: '#3b82f6'
                });
            }
        } catch (err) {
            console.error(err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err.message || 'Something went wrong. Please try again later.',
                confirmButtonColor: '#3b82f6'
            });
        }
    }
}

// Mobile sidebar functionality
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const wrapper = document.getElementById("sidebarWrapper");
const overlay = document.getElementById("sidebarOverlay");

window.toggleMenu = function () {
    if (sidebar) sidebar.classList.toggle("active");
    if (wrapper) wrapper.classList.toggle("mobile-visible");
    if (overlay) overlay.classList.toggle("active");
    if (sidebar) document.body.style.overflow = sidebar.classList.contains("active") ? "hidden" : "";
}

if (menuToggle) menuToggle.onclick = window.toggleMenu;
if (overlay) overlay.onclick = window.toggleMenu;

// Close sidebar when clicking on menu items (mobile)
const menuItems = document.querySelectorAll('#sidebar nav a');
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
            window.toggleMenu();
        }
    });
});
