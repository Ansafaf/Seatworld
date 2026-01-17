// Wishlist toggle functionality
async function toggleWishlist(variantId, button) {
  try {
    const response = await fetch('/wishlist/add', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ variantId })
    });

    const data = await response.json();

    // Handle authentication required
    if (response.status === 401) {
      if (typeof Swal !== 'undefined') {
        Swal.fire({
          icon: 'info',
          title: 'Login Required',
          text: 'Please login to add items to your wishlist.',
          showCancelButton: true,
          confirmButtonText: 'Login Now',
          confirmButtonColor: '#2449ff',
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = '/login';
          }
        });
      } else {
        showMessage('Please login to add items to your wishlist', 'error');
        setTimeout(() => window.location.href = '/login', 2000);
      }
      return;
    }

    if (data.success) {
      // Toggle button active state and SVG fill
      if (data.action === 'added') {
        button.classList.add('active');
        const svg = button.querySelector('.wishlist-icon');
        if (svg) svg.setAttribute('fill', 'currentColor');
      } else {
        button.classList.remove('active');
        const svg = button.querySelector('.wishlist-icon');
        if (svg) svg.setAttribute('fill', 'none');
      }

      // Show message
      showMessage(data.message, 'success');
    } else {
      showMessage(data.message || 'Failed to update wishlist', 'error');
    }
  } catch (error) {
    console.error('Wishlist toggle error:', error);
    showMessage('An error occurred', 'error');
  }
}

// Add to cart from wishlist
async function addToCartFromWishlist(variantId, button) {
  try {
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = "Adding...";

    // 1️⃣ Add to cart
    const cartRes = await fetch("/cart/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ variantId })
    });

    const cartData = await cartRes.json();

    if (!cartRes.ok || !cartData.success) {
      throw new Error(cartData.message || "Failed to add to cart");
    }

    // 2️⃣ Remove from wishlist (only after cart success)
    await fetch(`/wishlist/${variantId}`, {
      method: "DELETE"
    });

    // 3️⃣ Remove item from UI
    const wishlistItem = button.closest(".wishlist-item");
    if (wishlistItem) {
      wishlistItem.remove();
    }

    // 4️⃣ Update cart count (optional)
    const cartCountElement = document.querySelector(".cart-count");
    if (cartCountElement && cartData.cartCount !== undefined) {
      cartCountElement.textContent = cartData.cartCount;
    }

    showMessage("Moved to cart", "success");
    checkEmptyWishlist();

  } catch (error) {
    console.error("Add to cart error:", error);
    showMessage(error.message || "Something went wrong", "error");
  } finally {
    button.disabled = false;
    button.textContent = "Add To Cart";
  }
}

// Direct removal from wishlist
async function removeDirectly(variantId, element) {
  try {
    const response = await fetch(`/wishlist/${variantId}`, {
      method: "DELETE"
    });

    const data = await response.json();

    if (data.success) {
      const wishlistItem = element.closest(".wishlist-item");
      if (wishlistItem) {
        wishlistItem.style.opacity = '0';
        wishlistItem.style.transform = 'translateX(20px)';
        setTimeout(() => {
          wishlistItem.remove();
          checkEmptyWishlist();
        }, 300);
      }
      showMessage(data.message || "Removed from wishlist", "success");
    } else {
      showMessage(data.message || "Failed to remove item", "error");
    }
  } catch (error) {
    console.error("Remove error:", error);
    showMessage("Something went wrong", "error");
  }
}

function checkEmptyWishlist() {
  const items = document.querySelectorAll(".wishlist-item");
  if (items.length === 0) {
    const container = document.getElementById("wishlist-content");
    if (container) {
      container.innerHTML = `
        <div class="empty-wishlist">
          <span class="empty-icon">❤️</span>
          <h3>Your wishlist is empty</h3>
          <p>Seems like you haven't added any items to your wishlist yet.</p>
          <a href="/products" class="continue-shopping">Explore Products</a>
        </div>
      `;
    }
    // Hide pagination if it exists
    const pagination = document.querySelector(".pagination-container");
    if (pagination) pagination.remove();
  }
}


function showMessage(message, type) {
  // Create a simple toast notification
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 24px;
        background: ${type === 'success' ? '#22c55e' : '#ef4444'};
        color: white;
        border-radius: 8px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
