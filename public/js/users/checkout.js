
function toggleCoupon() {
    const content = document.getElementById('couponContent');
    const arrow = document.getElementById('couponArrow');

    if (content) {
        if (content.style.display === 'none') {
            content.style.display = 'block';
            content.classList.add('active');
            if (arrow) arrow.style.transform = 'rotate(180deg)';
        } else {
            content.style.display = 'none';
            content.classList.remove('active');
            if (arrow) arrow.style.transform = 'rotate(0)';
        }
    }
}

async function applyCoupon(code) {
    try {
        const response = await fetch('/checkout/apply-coupon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ couponCode: code })
        });
        const result = await response.json();

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Coupon Applied',
                text: result.message,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                location.reload(); // Reload to update UI state easily (showing "Applied" section)
                // Alternatively, we could update DOM elements manually:
                // document.getElementById('summaryTotal').innerText = '₹' + result.newTotal.toLocaleString('en-IN');
                // But reloading is safer to ensure all server-side rendering logic for "Applied" state kicks in.
            });
        } else {
            Swal.fire('Error', result.message, 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Failed to apply coupon', 'error');
    }
}

async function removeCoupon() {
    try {
        const response = await fetch('/checkout/remove-coupon', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const result = await response.json();

        if (result.success) {
            Swal.fire({
                icon: 'success',
                title: 'Coupon Removed',
                text: result.message,
                timer: 1500,
                showConfirmButton: false
            }).then(() => {
                location.reload();
            });
        } else {
            Swal.fire('Error', result.message, 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Failed to remove coupon', 'error');
    }
}

window.applyCoupon = applyCoupon;
window.removeCoupon = removeCoupon;

let selectedAddressId = null;
let savedCustomAddress = null;

function selectAddress(card) {
    // Remove active class from all cards
    document.querySelectorAll('.address-card').forEach(c => c.classList.remove('active'));
    // Add active class to selected card
    card.classList.add('active');

    // Fill form with selected address data
    const addressData = JSON.parse(card.dataset.address);
    fillAddressForm(addressData);

    selectedAddressId = card.dataset.id || addressData._id;
    savedCustomAddress = null; // Clear custom saved address

    // Enable fields but maybe highlight they are from selection
    // Or keep them editable? 
    // Usually if selecting an existing one, we populate it.
}

function fillAddressForm(data) {
    if (document.getElementById('addressName')) document.getElementById('addressName').value = data.name || '';
    if (document.getElementById('houseName')) document.getElementById('houseName').value = data.housename || '';
    if (document.getElementById('street')) document.getElementById('street').value = data.street || '';
    // Landmark removed
    if (document.getElementById('city')) document.getElementById('city').value = data.city || '';
    if (document.getElementById('pincode')) document.getElementById('pincode').value = data.pincode || '';
    if (document.getElementById('mobile')) document.getElementById('mobile').value = data.mobile || '';
    if (document.getElementById('country')) document.getElementById('country').value = data.country || 'India';
}

function clearAddressForm() {
    document.getElementById('shippingForm').reset();
    document.querySelectorAll('.address-card').forEach(c => c.classList.remove('active'));
    selectedAddressId = null;
    savedCustomAddress = null;

    // Re-enable inputs if they were disabled
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => input.disabled = false);

    document.querySelector('.btn-save-address').textContent = "Save Address";
    document.querySelector('.btn-save-address').classList.remove('btn-success');
}

function saveAddressForOrder() {
    const form = document.getElementById('shippingForm');
    if (!form.checkValidity()) {
        form.reportValidity();
        return;
    }

    // Collect data
    const formData = new FormData(form);
    const data = {};
    formData.forEach((value, key) => data[key] = value);

    // Additional Validation
    if (!/^\d{6}$/.test(data.pincode)) {
        Swal.fire('Error', 'Invalid Pincode', 'error');
        return;
    }
    if (!/^\d{10}$/.test(data.mobile)) {
        Swal.fire('Error', 'Invalid Mobile Number', 'error');
        return;
    }

    savedCustomAddress = data;
    selectedAddressId = null; // Clear selected ID since we are using custom data
    document.querySelectorAll('.address-card').forEach(c => c.classList.remove('active'));

    // Visual feedback
    // const inputs = document.querySelectorAll('.form-input');
    // inputs.forEach(input => input.disabled = true);

    const saveBtn = document.querySelector('.btn-save-address');
    saveBtn.textContent = "Address Saved";
    // Add success style if you have one, or just alert
    Swal.fire({
        icon: 'success',
        title: 'Address Saved for this order',
        text: 'This address will be used for your order.',
        timer: 1500,
        showConfirmButton: false
    });
}

function handleContinue() {
    // Just scroll to summary or validate address
    if (!selectedAddressId && !savedCustomAddress) {
        // Check if form has data that looks valid
        const form = document.getElementById('shippingForm');
        if (form.checkValidity() && document.getElementById('addressName').value) {
            // Auto-save?
            saveAddressForOrder();
        } else {
            Swal.fire('Alert', 'Please select or save a shipping address', 'warning');
        }
    }
}

// Proceed to Payment Logic
async function proceedToPayment() {

    // Ensure we have an address
    if (!selectedAddressId && !savedCustomAddress) {
        // Try to save current form if valid
        const form = document.getElementById('shippingForm');
        if (form.checkValidity() && document.getElementById('addressName').value) {
            saveAddressForOrder(); // This sets savedCustomAddress
            if (!savedCustomAddress) return; // Validation failed
        } else {
            Swal.fire('Alert', 'Please select or save a shipping address', 'warning');
            return;
        }
    }

    const payload = {
        addressData: savedCustomAddress,
    };

    if (selectedAddressId && !savedCustomAddress) {
        const activeCard = document.querySelector('.address-card.active');
        if (activeCard) {
            payload.addressData = JSON.parse(activeCard.dataset.address);
        }
    }

    if (!payload.addressData) {
        Swal.fire('Error', 'No address data found', 'error');
        return;
    }

    try {
        const response = await fetch('/checkout/address', { // Proceeding to address validation step
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            // Redirect to next step: Payment Options
            window.location.href = result.redirectUrl || '/checkout/payment-options';
        } else {
            Swal.fire('Error', result.message || 'Failed to proceed', 'error');
        }
    } catch (error) {
        console.error(error);
        Swal.fire('Error', 'Something went wrong', 'error');
    }
}

// Attach to window
window.proceedToPayment = proceedToPayment;

// Clean up old listener if needed or just replace usage
// document.querySelector('.btn-checkout').addEventListener('click', ...); // Removed from DOM



// Attach to window
window.toggleCoupon = toggleCoupon;
window.selectAddress = selectAddress;
window.clearAddressForm = clearAddressForm;
window.saveAddressForOrder = saveAddressForOrder;
window.handleContinue = handleContinue;

document.addEventListener('DOMContentLoaded', () => {
    const activeCard = document.querySelector('.address-card.active');
    if (activeCard) {
        selectAddress(activeCard);
    }

    // Add input listeners to detect form edits
    const formInputs = document.querySelectorAll('#shippingForm .form-input');
    formInputs.forEach(input => {
        input.addEventListener('input', () => {
            // User is editing the form, so clear any selected address
            selectedAddressId = null;
            savedCustomAddress = null;

            // Remove active class from all address cards
            document.querySelectorAll('.address-card').forEach(c => c.classList.remove('active'));

            // Reset save button text
            const saveBtn = document.querySelector('.btn-save-address');
            if (saveBtn && saveBtn.textContent === "Address Saved") {
                saveBtn.textContent = "Save Address";
            }
        });
    });
});
