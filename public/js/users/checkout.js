
function toggleCoupon() {
    const content = document.getElementById('couponContent');
    const arrow = document.getElementById('couponArrow');
    if (content) content.classList.toggle('active');
    if (arrow) arrow.style.transform = content.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0)';
}

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
    document.getElementById('addressName').value = data.name || '';
    document.getElementById('houseName').value = data.housename || '';
    document.getElementById('street').value = data.street || '';
    document.getElementById('landmark').value = data.landmark || '';
    document.getElementById('city').value = data.city || '';
    document.getElementById('pincode').value = data.pincode || '';
    document.getElementById('mobile').value = data.mobile || '';
    document.getElementById('country').value = data.country || 'India';
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
        title: 'Address Saved',
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
});
