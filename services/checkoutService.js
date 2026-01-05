import {getCartByUserId, calculateCartTotals} from "../services/cartService";


export async function verifyCheckoutCart(userId){
    const cartData = await getCartByUserId(userId, 1, 100);
    if(!cartData.cartItems.length){
        throw new Error("Cart is empty");
    }
    
    if(cartData.removedItemNames.length){
        throw new Error("Some items are unavaialable");
    }
    return cartData;
}

//validation for checkout only address (new address option)
export async function validateAddress(address){
   if(!address?.name || !address?.phone || !address?.pincode){
    throw new Error("Invalid delivery address");
   }
}

export const getSelectedPaymentMethod=()=>{
    const selected = document.querySelector('input[name="payment"]:checked');
    return selected ? selected.value : null;
}
