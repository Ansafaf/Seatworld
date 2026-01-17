window.editCoupon = (id) => {
    window.location.href = `/admin/coupons/edit/${id}`;
}

window.toggleStatus = (id, currentStatus) => {
    const action = currentStatus === 'active' ? 'block' : 'unblock';
    Swal.fire({
        title: `Are you sure you want to ${action} this coupon?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: action === 'block' ? '#d33' : '#28a745',
        cancelButtonColor: '#3085d6',
        confirmButtonText: `Yes, ${action} it!`
    }).then((result) => {
        if (result.isConfirmed) {
            fetch(`/admin/coupons/toggle-status/${id}`, {
                method: 'PATCH',
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        Swal.fire(
                            action === 'block' ? 'Blocked!' : 'Unblocked!',
                            `Coupon ${action === 'block' ? 'blocked' : 'unblocked'} successfully.`,
                            'success'
                        ).then(() => {
                            window.location.reload();
                        });
                    } else {
                        Swal.fire(
                            'Failed!',
                            data.message || 'Failed to update status.',
                            'error'
                        );
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    Swal.fire(
                        'Error!',
                        'An error occurred.',
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
