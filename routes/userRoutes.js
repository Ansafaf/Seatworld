import express from 'express';
const router = express.Router();
import { getLanding,getLogin,postLogin,getverifyOtp,verifyOtp,resendOtp,getforgotPass,postforgotPass,getHome,getProduct,getSignup,postSignup, getLogout, postPassCreation, otpverifyForgot, getPassCreation} from '../controller/userAuthController.js';
import {authMiddleware} from "../middleware/authMiddleware.js";

router.get('/',getLanding);
router.get('/login',getLogin);
router.post('/login',postLogin);

router.get("/verify-otp",getverifyOtp);
router.post("/verify-otp",verifyOtp);
router.get("/resend-otp",resendOtp);

router.get("/forgot-password",getforgotPass);
router.post("/forgot-password",postforgotPass);
router.post("/post-otp",otpverifyForgot);
router.get("/create-password",getPassCreation);
router.post("/create-password",postPassCreation);

router.get('/products',getProduct)
// router.get('/cart',getCart);
// router.get("/wishlist",getWishlist);

router.get('/dashboard',authMiddleware,getHome);

router.get('/signup',getSignup);
router.post('/signup',postSignup);

router.get('/logout',getLogout);

export default router;


