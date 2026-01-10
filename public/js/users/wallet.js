// Basic modal logic
function openAddMoneyModal() {
    document.getElementById('addMoneyModal').style.display = 'block';
}

function closeAddMoneyModal() {
    document.getElementById('addMoneyModal').style.display = 'none';
}

function scrollToHistory() {
    document.getElementById('transactionHistory').scrollIntoView({ behavior: 'smooth' });
}

// Close modal when clicking outside
window.onclick = function (event) {
    const modal = document.getElementById('addMoneyModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}

// Handle Add Money Form
document.getElementById('addMoneyForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    const amount = document.getElementById('amount').value;

    try {
        // In a real app, you would initiate Razorpay here.
        // For this demo, we call the backend API directly.

        const response = await fetch('/wallet/add-money', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount })
        });

        const result = await response.json();

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Success',
                text: 'Amount added successfully!',
                confirmButtonColor: '#3085d6',
            }).then(() => {
                location.reload();
            });
        } else {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: result.message || 'Failed to add money',
            });
        }
    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Something went wrong',
        });
    }
});
