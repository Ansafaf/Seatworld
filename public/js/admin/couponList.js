window.editCoupon = (id) => {
    window.location.href = `/admin/coupons/edit/${id}`;
}

window.deleteCoupon = (id) => {
    Swal.fire({
        title: 'Are you sure?',
        text: "You won't be able to revert this!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Yes, delete it!'
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/admin/coupons/delete/${id}`, {
                method: 'DELETE',
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire(
                            'Deleted!',
                            'Coupon deleted successfully.',
                            'success'
                        ).then(() => {
                            window.location.reload();
                        });
                    } else {
                        Swal.fire(
                            'Failed!',
                            'Failed to delete coupon.',
                            'error'
                        );
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Swal.fire(
                        'Error!',
                        'An error occurred while deleting.',
                        'error'
                    );
                });
        }
    });
}

// Debounced search functionality
const searchInput = document.getElementById('searchInput');
let searchTimeout;

if (searchInput) {
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();

        // Clear previous timeout
        clearTimeout(searchTimeout);

        // Set new timeout for debouncing (300ms delay for client-side)
        searchTimeout = setTimeout(() => {
            const rows = document.querySelectorAll('table tbody tr');
            rows.forEach(row => {
                const code = row.cells[0]?.textContent.toLowerCase();
                if (code) {
                    row.style.display = code.includes(searchTerm) ? '' : 'none';
                }
            });
        }, 300);
    });
}
