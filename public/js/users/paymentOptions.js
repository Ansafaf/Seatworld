async function placeOrder() {
    const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
    const terms = document.getElementById('terms').checked;

    if (!terms) {
        Swal.fire('Alert', 'Please agree to the Terms and Conditions', 'warning');
        return;
    }

    try {
        const response = await fetch('/checkout/place-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paymentMethod })
        });

        const result = await response.json();

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Order Placed!',
                text: 'Thank you for your purchase.',
                confirmButtonColor: '#000'
            }).then(() => {
                window.location.href = result.redirectUrl || '/profile';
            });
        } else {
            Swal.fire('Error', result.message || 'Failed to place order', 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Something went wrong', 'error');
    }
}
