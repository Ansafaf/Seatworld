
export const Message = Object.freeze({
    auth:{
        LOGIN_SUCCESS: "login successfull",
        LOGIN_FAILED: "Invalid email or password",
        UNAUTHORIZED: "You are not authorized to access this resource",
        TOKEN_MISSING:"Authentication token is missing",
        PASSWORD_NOT_MATCH:"Password do not match",
        INVALID_EMAIL:"Invalid email address",
        ALREADY_EXIST_EMAIL:"Email already in use",
        OTP_EXPIRES:'otp expired please resend',
        OTP_INVALID:"Invalid otp please try again",
        OTP_VERIFY_SUCCESS:"otp verified successfully",
        VERIFY_SUCCESS:"Verification successfull",
        SESSION_EXPIRES:"Session expired",
        NEW_OTP:"New otp send to your email",
        NO_ACCOUNT:"no account found with this email"
    },
    USER:{
        NOT_FOUND: "User not found",
        ALREADY_EXISTS: "User already exists",
        CREATED_SUCCESS: "User created successfully",
        UPDATED_SUCCESS: "User updated successfully",
    },
    PRODUCT:{
        NOT_FOUND:"Product not found",
        CREATED_SUCCESS:"Product added successfully",
        UPDATED_SUCCESS:"Product updated successfully",
        OUT_OF_STOCK:"Product is out of stock"
    },
    ORDER:{
        PLACED_SUCCESS:"Order placed successfully",
        PLACED_FAILURE:"Failed to place order",
        CANCELLED_SUCCESSS:"Order cancelled successfully",
        NOT_FOUND: "Order not found",
    },
    ORDER_ITEM:{
        UPDATED_SUCCESS:"Order & item updated successfully",

    },
    ITEM: {
        NOT_FOUND:"Item not found",
        UPDATED_SUCCESS:"Item status updated successfully",
        REMOVED_CART:"Item removed from cart",
        FAILED_REMOVE:"failed to remove item"
    },
    CATEGORY:{
        ADD:"Category added successfully",
        UPDATED_SUCCESS:"Category updated successfully",
        BLOCK:"Category blocked successfully",
        UNBLOCK:"Category unblocked successfully",
        NOT_FOUND:"category not found",
        ALREADY_EXISTS:"this category already exist try another one"
    },
    COMMON:{
        SOMETHING_WENT_WRONG: "Something went wrong",
        INVALID_REQUEST:"Invalid request",
        FORBIDDEN:"Access forbidden",
        INTERNAL_SERVER: "Internal server error"
    },
    ADMIN_DASHBOARD:{
        REVENUE_FAILED:"Failed to fetch revenue data",
        
    },
    ADMIN_USER:{
        ALREADY_BLOCKED:"User is already blocked",
        BLOCKED_SUCCESS:"User blocked successfully",
        ALREADY_UNBLOCKED:"User is already unblocked",
        UNBLOCKED_SUCCESS:"User unblocked successfully"
    },
    COUPON:{
        CREATED_SUCCESS:"Coupon created successfully",
        NOT_FOUND:"Coupon not found or inactive",
        EXPIRED:"Coupon has expired",
        ALREADY_USED:"Coupon already used",
        APPLIED:"Coupon applied successfully",
        APPLY_FAIL:"failed to apply coupon",
        UPDATED_SUCCESS:"Coupon updated successfully",
        DELETED_SUCCESS:"Coupon deleted successfully"
    },
    OFFER:{
        added:"Offer added successfully",
        NOT_FOUND:"Offer not found",
        UPDATED_SUCCESS:"Offer updated successfully",
        FAILED_UPDATE:"failed to update offer"
    },
    WISHLIST:{
        ADD:"item added to wishlist",
        REMOVE:"Item removed from wishlist",
        FAILED_UPDATE:"Failed to update wishlist"
    }
})