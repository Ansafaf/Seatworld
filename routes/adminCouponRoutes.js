import express from "express";
const adminCouponRouter = express.Router();
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import {
    getCouponlist,
    renderAddCoupon,
    createCoupon,
    renderEditCoupon,
    updateCoupon,
    deleteCoupon,
    toggleCouponStatus
} from "../controller/adminCoupon.js";

adminCouponRouter.get("/", adminAuthMiddleware, getCouponlist);
adminCouponRouter.get("/add", adminAuthMiddleware, renderAddCoupon);
adminCouponRouter.post("/add", adminAuthMiddleware, createCoupon);
adminCouponRouter.get("/edit/:id", adminAuthMiddleware, renderEditCoupon);
adminCouponRouter.post("/edit/:id", adminAuthMiddleware, updateCoupon);
adminCouponRouter.delete("/delete/:id", adminAuthMiddleware, deleteCoupon);
adminCouponRouter.patch("/toggle-status/:id", adminAuthMiddleware, toggleCouponStatus);

export default adminCouponRouter;