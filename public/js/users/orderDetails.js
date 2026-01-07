async function handleItemAction(orderId, itemId, action) {
    if (action === 'return') {
        const { value: formValues } = await Swal.fire({
            title: 'Request Return',
            html:
                '<div class="text-left">' +
                '<label class="block text-sm font-medium text-gray-700 mb-1">Reason for Return</label>' +
                '<select id="return-reason" class="swal2-select w-full border border-gray-300 rounded-md p-2 mb-4">' +
                '<option value="">Select a reason</option>' +
                '<option value="Damaged product">Damaged product</option>' +
                '<option value="Wrong item">Wrong item</option>' +
                '<option value="Size issue">Size issue</option>' +
                '<option value="Quality issue">Quality issue</option>' +
                '<option value="Other">Other</option>' +
                '</select>' +
                '<label class="block text-sm font-medium text-gray-700 mb-1">Additional Comments (Optional)</label>' +
                '<textarea id="return-comment" class="swal2-textarea w-full border border-gray-300 rounded-md p-2 m-0 h-24" placeholder="Enter your comments here..."></textarea>' +
                '</div>',
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Submit Request',
            confirmButtonColor: '#6366F1',
            preConfirm: () => {
                const reason = document.getElementById('return-reason').value;
                const comment = document.getElementById('return-comment').value;
                if (!reason) {
                    Swal.showValidationMessage('Please select a reason for return');
                    return false;
                }
                return { returnReason: reason, returnComment: comment };
            }
        });

        if (formValues) {
            await performAction(orderId, itemId, action, formValues);
        }
        return;
    }

    const actionText = action === 'cancel' ? 'Cancel' : 'Return';
    const confirmButtonColor = action === 'cancel' ? '#EF4444' : '#6366F1';

    const result = await Swal.fire({
        title: `Are you sure?`,
        text: `Do you really want to ${action} this item?`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: confirmButtonColor,
        cancelButtonColor: '#9CA3AF',
        confirmButtonText: `Yes, ${actionText} it!`
    });

    if (result.isConfirmed) {
        await performAction(orderId, itemId, action);
    }
}

async function performAction(orderId, itemId, action, extraData = {}) {
    try {
        const response = await fetch(`/orders/${orderId}/items/${itemId}/request`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ action, ...extraData })
        });

        const data = await response.json();

        if (data.success) {
            await Swal.fire({
                title: 'Success!',
                text: data.message,
                icon: 'success',
                timer: 2000,
                showConfirmButton: false
            });
            location.reload();
        } else {
            Swal.fire({
                title: 'Error!',
                text: data.message || `Failed to ${action} item`,
                icon: 'error'
            });
        }
    } catch (error) {
        console.error(`Error ${action}ing item:`, error);
        Swal.fire({
            title: 'Error!',
            text: 'Something went wrong. Please try again.',
            icon: 'error'
        });
    }
}
