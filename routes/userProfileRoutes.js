import express from 'express';
const router = express.Router();
import { upload } from "../config/cloudinary.js";
import { getProfile, getprofileEdit, postprofileEdit, updateProfile, getAddresslist, getAddaddress, postAddaddress, getEmailchange, postEmailchange, getupdatePass, postupdatePass, getEditAddress, postEditAddress, deleteAddress, getEmailOtp, postEmailOtp, postDefaultAddres, getCoupons } from "../controller/userProfileController.js";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { requireAuth } from "../middleware/authMiddleware.js";

router.get("/profile", requireAuth, getProfile);
router.get("/profile/edit", requireAuth, getprofileEdit);
router.post("/profile/edit", requireAuth, postprofileEdit);

router.post("/profile/avatar", upload.single("avatar"), updateProfile);

router.get("/profile/change-email", requireAuth, getEmailchange);
router.post("/profile/change-email", requireAuth, postEmailchange);
//email
router.get("/email/change-otp", getEmailOtp);
router.post("/email/change-otp", postEmailOtp);

//address
router.get("/address", requireAuth, getAddresslist);
router.get("/address/add", requireAuth, getAddaddress);
router.post("/address/add", requireAuth, postAddaddress);

router.get("/address/edit/:addressId", requireAuth, getEditAddress);
router.post("/address/edit/:addressId", requireAuth, postEditAddress);
router.post('/address/set-default/:addressId', requireAuth, postDefaultAddres);

router.post("/address/delete/:addressId", requireAuth, deleteAddress); //delete request through post
//pass
router.get("/password-change", requireAuth, getupdatePass);
router.post("/password-change", requireAuth, postupdatePass);

router.get("/coupons", requireAuth, getCoupons);


export default router;
