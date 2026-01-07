
function updateOverallStatusUI(newStatus) {
    const statusDisplay = document.querySelector('.text-lg.font-black.text-green-600.uppercase');
    if (statusDisplay) {
        statusDisplay.textContent = newStatus;

        const select = document.querySelector('select[name="status"]');
        if (select) select.value = ['cancelled', 'returned'].includes(newStatus) ? newStatus : select.value;
    }
}


async function updateItemStatus(orderId, itemId) {
    const select = document.getElementById(`status-${itemId}`);
    const status = select.value;

    try {
        const response = await fetch(`/admin/orders/items/${itemId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, status })
        });

        const data = await response.json();
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Item Updated',
                text: data.message,
                timer: 1500,
                showConfirmButton: false
            });

            // Update overall UI summary status if provided
            if (data.orderStatus) {
                updateOverallStatusUI(data.orderStatus);
            }

            // Update styling of the select if it's a special status
            const isSpecial = ['cancel_requested', 'return_requested'].includes(status);
            select.className = `text-[10px] font-bold p-1 ${isSpecial ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200'} border rounded focus:ring-0 cursor-pointer capitalize`;

        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
        }
    } catch (error) {
        console.error('Error updating item status:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'An unexpected error occurred' });
    }
}

// Update Overall Order Status
document.getElementById('updateStatusForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const status = formData.get('status');
    const orderId = formData.get('orderId');

    try {
        const response = await fetch('/admin/orders/update-status', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, status })
        });

        const data = await response.json();
        if (data.success) {
            Swal.fire({
                icon: 'success',
                title: 'Order Updated',
                text: data.message,
                timer: 1500,
                showConfirmButton: false
            });

            // Update UI: Summary Status
            updateOverallStatusUI(status);

            // Update UI: All Item Selects
            document.querySelectorAll('select[id^="status-"]').forEach(select => {
                select.value = status;
                const isSpecial = ['cancel_requested', 'return_requested'].includes(status);
                select.className = `text-[10px] font-bold p-1 ${isSpecial ? 'bg-orange-50 border-orange-300 text-orange-700' : 'bg-gray-50 border-gray-200'} border rounded focus:ring-0 cursor-pointer capitalize`;
            });

        } else {
            Swal.fire({ icon: 'error', title: 'Error', text: data.message });
        }
    } catch (error) {
        console.error('Error updating status:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'An unexpected error occurred' });
    }
});

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
                location.reload();
            } else {
                Swal.fire({ icon: 'error', title: 'Error', text: data.message });
            }
        } catch (error) {
            console.error('Error handling return action:', error);
            Swal.fire({ icon: 'error', title: 'Error', text: 'An unexpected error occurred' });
        }
    }
}
