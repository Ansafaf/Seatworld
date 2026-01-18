import express from 'express';
const router = express.Router();
import { getLanding, getLogin, postLogin, getverifyOtp, verifyOtp, resendOtp, getforgotPass, postforgotPass, getHome, getSignup, postSignup, getLogout, postPassCreation, otpverifyForgot, getPassCreation, getotpForgot, getReferralCode, getUserCounts } from '../controller/userAuthController.js';
import { requireAuth } from "../middleware/authMiddleware.js";

router.get('/', getLanding);
router.get('/login', getLogin);
router.post('/login', postLogin);

router.get("/api/user/counts", getUserCounts);

router.get("/verify-otp", getverifyOtp);
router.post("/verify-otp", verifyOtp);
router.get("/resend-otp", resendOtp);

router.get("/forgot-password", getforgotPass);
router.post("/forgot-password", postforgotPass);
router.get("/forgot-password/verify", getotpForgot);
router.post("/post-otp", otpverifyForgot);
router.get("/create-password", getPassCreation);
router.post("/create-password", postPassCreation);



router.get('/home', getHome);
router.get('/signup', getSignup);
router.post('/signup', postSignup);
router.get("/referral", requireAuth, getReferralCode);

router.get('/logout', getLogout);

export default router;


