






// Return Modal Functions
function openReturnModal(el) {
    const reason = el.getAttribute('data-reason');
    const comment = el.getAttribute('data-comment');
    const date = el.getAttribute('data-date');
    const itemId = el.getAttribute('data-item-id');

    document.getElementById('returnReasonText').textContent = reason || 'Not specified';
    document.getElementById('returnCommentText').textContent = comment || 'No comments provided';
    document.getElementById('returnDateText').textContent = date ? new Date(date).toLocaleString('en-GB') : 'Unknown';

    const modal = document.getElementById('returnModal');
    modal.classList.remove('hidden');

    // Setup buttons
    document.getElementById('approveReturnBtn').onclick = () => handleReturnAction(itemId, 'approve_return');
    document.getElementById('rejectReturnBtn').onclick = () => handleReturnAction(itemId, 'reject_return');
}

function viewReturnDetails(dataString) {
    // Legacy support or fallback
    let data;
    try {
        data = typeof dataString === 'string' ? JSON.parse(dataString) : dataString;
        document.getElementById('returnReasonText').textContent = data.reason || 'Not specified';
        document.getElementById('returnCommentText').textContent = data.comment || 'No comments provided';
        document.getElementById('returnDateText').textContent = data.date ? new Date(data.date).toLocaleString('en-GB') : 'Unknown';

        const modal = document.getElementById('returnModal');
        modal.classList.remove('hidden');

        document.getElementById('approveReturnBtn').onclick = () => handleReturnAction(data.itemId, 'approve_return');
        document.getElementById('rejectReturnBtn').onclick = () => handleReturnAction(data.itemId, 'reject_return');
    } catch (e) {
        console.error("Error parsing return data:", e);
    }
}

function closeReturnModal() {
    document.getElementById('returnModal').classList.add('hidden');
}

async function handleReturnAction(itemId, action) {
    const actionText = action === 'approve_return' ? 'Approve' : 'Reject';
    const confirmColor = action === 'approve_return' ? '#059669' : '#DC2626';

    const result = await Swal.fire({
        title: `${actionText} Return?`,
        text: `Are you sure you want to ${actionText.toLowerCase()} this return request?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: confirmColor,
        cancelButtonColor: '#9CA3AF',
        confirmButtonText: `Yes, ${actionText}!`
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/admin/orders/items/${itemId}/approve`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action })
            });

            const data = await response.json();
            if (data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Action Successful',
                    text: data.message,
                    timer: 2000,
                    showConfirmButton: false
                });

                closeReturnModal();

                // Update UI live
                const newStatus = action === 'approve_return' ? 'returned' : 'delivered';
                updateItemStatusUI(itemId, newStatus);

                // Refresh overall order status if backend could determine it
                // (Note: approveItemAction doesn't currently return orderStatus in the json,
                // but we can guess or wait for the next refresh. For now, just update the item badge.)

            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: data.message });
            }
        } catch (error) {
            console.error('Error handling return action:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'An unexpected error occurred' });
        }
    }
}

// ----- Dynamic Order Status Progression -----
const statusProgression = {
    pending: 'confirmed',
    confirmed: 'delivered',
    delivered: null,
    return_requested: 'returned',
    returned: null,
    cancelled: null
};

const statusLabels = {
    confirmed: 'Mark as Confirmed',
    delivered: 'Mark as Delivered',
    returned: 'Process Return',
    // For delivered final state, we show completion message instead of button
};

const statusBadgeColors = {
    pending: 'bg-yellow-500',
    confirmed: 'bg-blue-500',
    delivered: 'bg-green-500',
    returned: 'bg-gray-500',
    cancelled: 'bg-red-500'
};

function getNextStatus(current) {
    return statusProgression[current] || null;
}

function updateStatusUI(current) {
    const badge = document.getElementById('order-status-badge');
    const btn = document.getElementById('next-status-btn');
    if (!badge) return;
    // Update badge text and color
    badge.textContent = current.charAt(0).toUpperCase() + current.slice(1);
    const colorClass = statusBadgeColors[current] || 'bg-gray-500';
    badge.className = `px-3 py-1 rounded-full text-sm font-bold text-white ${colorClass} uppercase`;

    const next = getNextStatus(current);
    if (next) {
        btn.classList.remove('hidden');
        btn.textContent = statusLabels[next] || `Mark as ${next.charAt(0).toUpperCase() + next.slice(1)}`;
    } else {
        btn.classList.add('hidden');
        // Show completion toast if delivered
        if (current === 'delivered') {
            Swal.fire({
                icon: 'success',
                title: 'Order Completed',
                text: 'All items have been delivered.',
                timer: 2000,
                showConfirmButton: false
            });
        }
    }
}

async function handleNextStatus(orderId) {
    const current = document.getElementById('order-status-badge').textContent.toLowerCase();
    const next = getNextStatus(current);
    if (!next) return;

    const confirmResult = await Swal.fire({
        title: `Mark as ${next.charAt(0).toUpperCase() + next.slice(1)}?`,
        text: `Are you sure you want to change the order status to ${next}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#9CA3AF',
        confirmButtonText: 'Yes, change it!'
    });

    if (!confirmResult.isConfirmed) return;

    const btn = document.getElementById('next-status-btn');
    btn.disabled = true;
    btn.innerHTML = '<svg class="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>Processing';

    try {
        const response = await fetch(`/admin/orders/update-status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, status: next })
        });
        const data = await response.json();
        if (data.success) {
            // Update Overall UI
            updateStatusUI(next);

            // Update All Individual Items UI
            document.querySelectorAll('.item-next-status-btn').forEach(itemBtn => {
                const itemId = itemBtn.getAttribute('data-item-id');
                updateItemStatusUI(itemId, next);
            });

            Swal.fire({ icon: 'success', title: 'Status Updated', text: data.message, timer: 1500, showConfirmButton: false });
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
        }
    } catch (err) {
        console.error('Error updating status:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'An unexpected error occurred' });
    } finally {
        btn.disabled = false;
        btn.innerHTML = statusLabels[next] || `Mark as ${next.charAt(0).toUpperCase() + next.slice(1)}`;
    }
}

function updateItemStatusUI(itemId, current) {
    const badge = document.getElementById(`item-status-${itemId}`);
    const btn = document.querySelector(`button[data-item-id="${itemId}"]`);
    if (!badge) return;

    // Update badge text and style
    badge.textContent = current;
    badge.className = `px-2 py-0.5 rounded text-[10px] font-bold uppercase ${current === 'cancelled' ? 'bg-red-100 text-red-600' :
        current === 'delivered' ? 'bg-green-100 text-green-600' :
            'bg-blue-100 text-blue-600'
        }`;

    const next = getNextStatus(current);
    if (next && btn) {
        btn.classList.remove('hidden');
        btn.textContent = statusLabels[next] || `Mark as ${next.charAt(0).toUpperCase() + next.slice(1)}`;
        btn.setAttribute('data-current-status', current);
    } else if (btn) {
        btn.classList.add('hidden');
    }
}

async function handleItemNextStatus(orderId, itemId) {
    const badge = document.getElementById(`item-status-${itemId}`);
    if (!badge) return;
    const current = badge.textContent.trim().toLowerCase();
    const next = getNextStatus(current);
    if (!next) return;

    const btn = document.querySelector(`button[data-item-id="${itemId}"]`);

    // Special handling for the Return Requested -> Returned transition
    if (current === 'return_requested' && next === 'returned') {
        // We reuse the existing return modal logic
        const el = btn; // btn has all data attributes needed: reason, comment, date
        openReturnModal({
            getAttribute: (attr) => el.getAttribute(attr)
        });
        return;
    }

    const confirmResult = await Swal.fire({
        title: `Mark Item as ${next.charAt(0).toUpperCase() + next.slice(1)}?`,
        text: `Are you sure you want to change this item's status to ${next}?`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#059669',
        cancelButtonColor: '#9CA3AF',
        confirmButtonText: 'Yes, change it!'
    });

    if (!confirmResult.isConfirmed) return;

    const originalHtml = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<span class="animate-spin inline-block h-3 w-3 mr-1 border-2 border-white border-t-transparent rounded-full"></span>';

    try {
        const response = await fetch(`/admin/orders/items/${itemId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, status: next })
        });
        const data = await response.json();
        if (data.success) {
            updateItemStatusUI(itemId, next);
            // Also update order status badge if provided
            if (data.orderStatus) {
                updateStatusUI(data.orderStatus.toLowerCase());
            }
            Swal.fire({ icon: 'success', title: 'Item Updated', text: data.message, timer: 1500, showConfirmButton: false });
        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
        }
    } catch (err) {
        console.error('Error updating item status:', err);
        Swal.fire({ icon: 'error', title: 'Error', text: 'An unexpected error occurred' });
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
    }
}

// Initialize UI on page load
document.addEventListener('DOMContentLoaded', () => {
    // Order level
    const badgeElement = document.getElementById('order-status-badge');
    if (badgeElement) {
        const initialStatus = badgeElement.textContent.trim().toLowerCase();
        updateStatusUI(initialStatus);
    }
    // Item level
    document.querySelectorAll('.item-next-status-btn').forEach(btn => {
        const itemId = btn.getAttribute('data-item-id');
        const current = btn.getAttribute('data-current-status').toLowerCase();
        updateItemStatusUI(itemId, current);
    });
});

// End of dynamic status progression
