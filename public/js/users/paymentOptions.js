

async function placeOrder() {
  const paymentMethod = getSelectedPaymentMethod();
  const terms = document.getElementById('terms').checked;

  if (!terms) {
    Swal.fire('Alert', 'Please agree to the Terms and Conditions', 'warning');
    return;
  }
  if (!paymentMethod) {
    Swal.fire("Alert", "Please select payment method first", "warning");
  }
  if (paymentMethod == "COD") {
    await placeCODOrder();
    return;
  }
  else {
    // await placeOnlineOrder(paymentMethod); // Assuming this might be needed, but sticking to user's structure for now
    // If placeOnlineOrder handles the flow, we should return. 
    // If not, we fall through to the generic fetch below.
    // However, generic fetch below handles generic placement.
    // Let's assume for non-COD (Online), we might validly reach here OR placeOnlineOrder does something else.
    // Given I don't see placeOnlineOrder, I will leave it but ensure we don't double submit if we can avoid it.
    // For now, fixing the endpoint is the critical part.
  }
  try {
    const response = await fetch('/place-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
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


const getSelectedPaymentMethod = () => {
  const selected = document.querySelector('input[name="payment"]:checked');
  return selected ? selected.value : null;
}

async function placeCODOrder() {
  try {
    const response = await fetch('/place-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        paymentMethod: "COD"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      Swal.fire("Error", data.message || "Order failed");
      return;
    }

    // Redirect to success page ONLY for COD
    window.location.href = `/order-success?orderId=${data.orderId}`;
  } catch (error) {
    console.error("COD order error:", error);
    Swal.fire('Error', 'Something went wrong', 'error');
  }
}

window.placeOrder = placeOrder;
window.getSelectedPaymentMethod = getSelectedPaymentMethod;
