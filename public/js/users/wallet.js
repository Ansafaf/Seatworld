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
        // Step 1: Create Razorpay Order
        const orderResponse = await fetch('/wallet/add-money/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount })
        });

        const orderData = await orderResponse.json();

        if (!orderData.success) {
            throw new Error(orderData.message || 'Failed to initiate payment');
        }

        // Step 2: Open Razorpay Checkout Modal
        const options = {
            key: orderData.key_id,
            amount: orderData.amount,
            currency: orderData.currency,
            name: "SeatWorld Wallet",
            description: "Wallet Top-up",
            order_id: orderData.orderId,
            handler: async function (response) {
                // Step 3: Verify Payment and Update Wallet
                try {
                    const verifyResponse = await fetch('/wallet/add-money', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            amount: amount
                        })
                    });

                    const verifyResult = await verifyResponse.json();

                    if (verifyResult.success) {
                        Swal.fire({
                            icon: 'success',
                            title: 'Success',
                            text: 'Money added to wallet successfully!',
                            confirmButtonColor: '#3085d6',
                        }).then(() => {
                            location.reload();
                        });
                    } else {
                        throw new Error(verifyResult.message || 'Payment verification failed');
                    }
                } catch (err) {
                    Swal.fire({
                        icon: 'error',
                        title: 'Error',
                        text: err.message || 'Something went wrong during verification',
                    });
                }
            },
            prefill: {
                name: document.querySelector('.user-name')?.innerText.trim() || '',
                email: document.querySelector('.user-email')?.innerText.trim() || ''
            },
            theme: { color: "#3b82f6" }
        };

        const rzp = new Razorpay(options);
        rzp.open();
        closeAddMoneyModal();

    } catch (error) {
        console.error('Error:', error);
        Swal.fire({
            icon: 'error',
            title: 'Error',
            text: error.message || 'Something went wrong',
        });
    }
});
