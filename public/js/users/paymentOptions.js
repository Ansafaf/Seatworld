

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
  if (paymentMethod === "COD") {
    await placeCODOrder();
    return;
  }
  else if (paymentMethod === "ONLINE") {
    await handleRazorpayPayment();
    return;
  }
  else if (paymentMethod === "wallet") {
    await placeWalletOrder();
    return;
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

async function handleRazorpayPayment() {
  try {
    const response = await fetch('/razorpay/create-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const data = await response.json();
    if (!data.success) {
      window.location.href = `/order-failed?message=${encodeURIComponent(data.message || "Failed to initiate payment")}`;
      return;
    }

    const options = {
      key: data.key_id,
      amount: data.amount,
      currency: data.currency,
      name: "SeatWorld",
      description: "Purchase Payment",
      order_id: data.orderId,
      handler: async function (response) {
        // Step 2: Verify payment on server
        await verifyAndPlaceOrder(response);
      },
      prefill: {
        name: data.user.name,
        email: data.user.email,
        contact: data.user.mobile
      },
      theme: { color: "#000000" }
    };

    const rzp = new Razorpay(options);
    rzp.on('payment.failed', function (response) {
      window.location.href = `/order-failed?message=${encodeURIComponent(response.error.description)}`;
    });
    rzp.open();

  } catch (error) {
    console.error("Razorpay error:", error);
    Swal.fire("Error", "Something went wrong with Razorpay", "error");
  }
}

async function verifyAndPlaceOrder(razorpayResponse) {
  try {
    // Step 1: Verify Signature
    const verifyRes = await fetch('/razorpay/verify-payment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(razorpayResponse)
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      window.location.href = `/order-failed?message=${encodeURIComponent(verifyData.message || "Payment verification failed")}`;
      return;
    }

    // Step 2: Place the actual order in our system
    const orderRes = await fetch('/place-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        paymentMethod: "ONLINE",
        razorpay_payment_id: razorpayResponse.razorpay_payment_id,
        razorpay_order_id: razorpayResponse.razorpay_order_id,
        razorpay_signature: razorpayResponse.razorpay_signature
      })
    });

    const orderData = await orderRes.json();
    if (orderData.success) {
      Swal.fire({
        icon: 'success',
        title: 'Order Placed!',
        text: 'Payment successful and order confirmed.',
        confirmButtonColor: '#000'
      }).then(() => {
        window.location.href = `/order-success?orderId=${orderData.orderId}`;
      });
    } else {
      window.location.href = `/order-failed?message=${encodeURIComponent(orderData.message || "Failed to finalize order")}`;
    }

  } catch (error) {
    console.error("Verification/Placement error:", error);
    window.location.href = `/order-failed?message=${encodeURIComponent("Something went wrong while confirming your order")}`;
  }
}

async function placeWalletOrder() {
  try {
    const response = await fetch('/place-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        paymentMethod: "wallet"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      window.location.href = `/order-failed?message=${encodeURIComponent(data.message || "Order failed")}`;
      return;
    }

    if (data.success) {
      Swal.fire({
        icon: 'success',
        title: 'Order Placed!',
        text: 'Payment successful using wallet.',
        confirmButtonColor: '#000'
      }).then(() => {
        window.location.href = `/order-success?orderId=${data.orderId}`;
      });
    } else {
      window.location.href = `/order-failed?message=${encodeURIComponent(data.message || "Order failed")}`;
    }
  } catch (error) {
    console.error("Wallet order error:", error);
    window.location.href = `/order-failed?message=${encodeURIComponent("Something went wrong with your wallet payment")}`;
  }
}

window.placeOrder = placeOrder;
window.getSelectedPaymentMethod = getSelectedPaymentMethod;
window.handleRazorpayPayment = handleRazorpayPayment;
window.placeWalletOrder = placeWalletOrder;

