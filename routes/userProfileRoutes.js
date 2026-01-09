import express from 'express';
const router = express.Router();
import { upload } from "../config/cloudinary.js";
import { getProfile, getprofileEdit, postprofileEdit, updateProfile, getAddresslist, getAddaddress, postAddaddress, getEmailchange, postEmailchange, getupdatePass, postupdatePass, getEditAddress, postEditAddress, deleteAddress, getEmailOtp, postEmailOtp, postDefaultAddres, getCoupons } from "../controller/userProfileController.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { authMiddleware } from "../middleware/authMiddleware.js";

router.get("/profile", authMiddleware, getProfile);
router.get("/profile/edit", authMiddleware, getprofileEdit);
router.post("/profile/edit", authMiddleware, postprofileEdit);

router.post("/profile/avatar", upload.single("avatar"), updateProfile);

router.get("/profile/change-email", authMiddleware, getEmailchange);
router.post("/profile/change-email", authMiddleware, postEmailchange);
//email
router.get("/email/change-otp", getEmailOtp);
router.post("/email/change-otp", postEmailOtp);

//address
router.get("/address", authMiddleware, getAddresslist);
router.get("/address/add", authMiddleware, getAddaddress);
router.post("/address/add", authMiddleware, postAddaddress);

router.get("/address/edit/:id", authMiddleware, getEditAddress);
router.post("/address/edit/:id", authMiddleware, postEditAddress);
router.post('/address/set-default/:id', authMiddleware, postDefaultAddres);

router.post("/address/delete/:id", authMiddleware, deleteAddress); //delete request through post
//pass
router.get("/password-change", authMiddleware, getupdatePass);
router.post("/password-change", authMiddleware, postupdatePass);

router.get("/coupons", authMiddleware, getCoupons);

export default router;
