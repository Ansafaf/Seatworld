

async function placeOrder() {
    const paymentMethod = getSelectedPaymentMethod();
    const terms = document.getElementById('terms').checked;
    
    if (!terms) {
        Swal.fire('Alert', 'Please agree to the Terms and Conditions', 'warning');
        return;
    }
    if(!paymentMethod){
        Swal.fire("Alert","Please select payment method first","warning");
    }
    if(paymentMethod == "COD"){
        placeCODOrder();
    }
    else{
        placeOnlineOrder(paymentMethod);
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


export const getSelectedPaymentMethod=()=>{
    const selected = document.querySelector('input[name="payment"]:checked');
    return selected ? selected.value : null;
}

async function placeCODOrder() {
  try {
    const response = await fetch('/place-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        paymentMethod: "COD"
      })
    });

    const data = await response.json();

    if (!response.ok) {
      alert(data.message || "Order failed");
      return;
    }

    // Redirect to success page ONLY for COD
    window.location.href = `/order-success?orderId=${data.orderId}`;
  } catch (error) {
    console.error("COD order error:", error);
    alert("Something went wrong");
  }
}
