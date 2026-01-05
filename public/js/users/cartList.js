const Toast = Swal.mixin({
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 3000,
    timerProgressBar: true
});

async function updateQty(variantId, change) {
    const card = document.querySelector(`.cart-item-card[data-variant-id="${variantId}"]`);
    if (!card) return;

    const qtyValueDisplay = card.querySelector('.qty-value');
    const minusBtn = card.querySelector('.qty-btn.minus');
    const plusBtn = card.querySelector('.qty-btn.plus');

    let currentQty = parseInt(qtyValueDisplay.textContent);
    let newQty = currentQty + change;

    // Frontend validation
    if (newQty < 1) return;

    // Show loading state (optional, can be subtle)
    qtyValueDisplay.style.opacity = '0.5';

    try {
        const response = await fetch('/cart/update-quantity', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variantId, quantity: newQty })
        });

        const data = await response.json();

        if (data.success) {
            if (data.outOfStock) {
                // Item became out of stock during the update attempt
                card.style.opacity = '0';
                card.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    card.remove();
                    if (data.cartCount === 0) {
                        location.reload();
                    }
                }, 300);

                Toast.fire({
                    icon: 'error',
                    title: 'This product is out of stock and has been removed'
                });
            } else {
                qtyValueDisplay.textContent = newQty;
                // Update button states
                minusBtn.disabled = newQty <= 1;
            }

            // Update Summary regardless (subtotal might have changed)
            updateSummary(data);
        } else {
            Toast.fire({
                icon: 'error',
                title: data.message || 'Error updating quantity'
            });
        }
    } catch (error) {
        console.error('Update qty error:', error);
        Toast.fire({
            icon: 'error',
            title: 'Failed to update quantity'
        });
    } finally {
        qtyValueDisplay.style.opacity = '1';
    }
}

async function removeItem(variantId) {
    const result = await Swal.fire({
        title: 'Remove Item?',
        text: "Are you sure you want to remove this item from your cart?",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#000',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, remove it!'
    });

    if (result.isConfirmed) {
        try {
            const response = await fetch(`/cart/remove/${variantId}`, {
                method: 'DELETE'
            });

            const data = await response.json();

            if (data.success) {
                const card = document.querySelector(`.cart-item-card[data-variant-id="${variantId}"]`);
                if (card) {
                    card.style.opacity = '0';
                    card.style.transform = 'translateX(20px)';
                    setTimeout(() => {
                        card.remove();
                        if (data.cartCount === 0) {
                            location.reload(); // Reload to show empty state
                        }
                    }, 300);
                }

                updateSummary(data);

                Toast.fire({
                    icon: 'success',
                    title: 'Item removed'
                });
            } else {
                Toast.fire({
                    icon: 'error',
                    title: 'Failed to remove item'
                });
            }
        } catch (error) {
            console.error('Remove item error:', error);
            Toast.fire({
                icon: 'error',
                title: 'Something went wrong'
            });
        }
    }
}

function updateSummary(data) {
    const subtotalEl = document.getElementById('subtotal');
    const deliveryFeeEl = document.getElementById('deliveryFee');
    const totalEl = document.getElementById('total');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (subtotalEl) subtotalEl.textContent = `₹${data.subtotal}`;
    if (deliveryFeeEl) {
        deliveryFeeEl.textContent = data.deliveryFee;
        if (data.deliveryFee === 'Free') {
            deliveryFeeEl.classList.add('free');
        } else {
            deliveryFeeEl.classList.remove('free');
        }
    }
    if (totalEl) totalEl.textContent = `₹${data.total}`;

    if (checkoutBtn && data.subtotal === 0) {
        checkoutBtn.disabled = true;
    }
}
