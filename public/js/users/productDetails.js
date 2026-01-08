

let wishlistBtn = document.getElementById("wishlist-btn");

// Image Switcher
function changeImage(src, el) {
    document.getElementById('main-image').src = src;
    document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
    el.classList.add('active');

    // Reset zoom
    setupZoom();
}

// Zoom Functionality
function setupZoom() {
    const container = document.getElementById('img-container');
    const img = document.getElementById('main-image');

    container.addEventListener('mousemove', function (e) {
        const { left, top, width, height } = container.getBoundingClientRect();
        const x = (e.clientX - left) / width;
        const y = (e.clientY - top) / height;

        img.style.transformOrigin = `${x * 100}% ${y * 100}%`;
        img.style.transform = "scale(2)"; // Zoom level
    });

    container.addEventListener('mouseleave', function () {
        img.style.transform = "scale(1)";
        setTimeout(() => {
            img.style.transformOrigin = "center center";
        }, 300);
    });
}

// Initialize
setupZoom();

const cartButton = document.getElementById("cart-button");
if (cartButton) {
    cartButton.addEventListener("click", async () => {
        const variantId = cartButton.getAttribute("data-variant-id");
        if (!variantId) {
            Swal.fire({
                icon: 'error',
                title: 'Oops...',
                text: 'Please select a valid product variant.'
            });
            return;
        }

        try {
            // Show loading state
            cartButton.disabled = true;
            cartButton.textContent = 'Adding...';

            const response = await fetch('/cart/add', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ variantId })
            });

            const data = await response.json();

            if (data.success) {
                // Update cart count in header if it exists
                // Update cart count in header
                const cartLink = document.getElementById('header-cart-link');
                if (cartLink) {
                    let cartBadge = cartLink.querySelector('.cart-count-badge');
                    if (!cartBadge && data.cartCount > 0) {
                        cartBadge = document.createElement('span');
                        cartBadge.className = 'cart-count-badge';
                        cartLink.appendChild(cartBadge);
                    }
                    if (cartBadge) {
                        cartBadge.textContent = data.cartCount;
                        // Optional: remove if 0 again, though usually we add here.
                        if (data.cartCount === 0) cartBadge.remove();
                    }
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Added to Cart!',
                    text: 'Your item has been added successfully.',
                    showCancelButton: true,
                    confirmButtonText: 'View Cart',
                    cancelButtonText: 'Continue Shopping',
                    confirmButtonColor: '#2449ff',
                    cancelButtonColor: '#94a3b8',
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.location.href = '/cart';
                    }
                });
            } else {
                // If user is not logged in, response status is 401
                if (response.status === 401) {
                    Swal.fire({
                        icon: 'info',
                        title: 'Login Required',
                        text: 'Please login to add items to your cart.',
                        showCancelButton: true,
                        confirmButtonText: 'Login Now',
                        confirmButtonColor: '#2449ff',
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = '/login';
                        }
                    });
                } else {
                    Swal.fire({
                        icon: 'error',
                        title: 'Failed',
                        text: data.message || 'Something went wrong!'
                    });
                }
            }
        } catch (err) {
            console.error('Add to cart error:', err);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'An error occurred. Please try again later.'
            });
        } finally {
            cartButton.disabled = false;
            cartButton.textContent = 'Add to Cart';
        }
    });
}
