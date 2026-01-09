import Coupon from "../models/couponModel.js";
import { paginate } from "../utils/paginationHelper.js";
import logger from "../utils/logger.js";

export const getCouponlist = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 10;
        const search = req.query.search || "";
        const query = {};
        if (search) {
            query.$or = [
                { description: { $regex: search, $options: "i" } },
                { couponCode: { $regex: search, $options: "i" } }
            ];
        }

        const { items: coupons, pagination } = await paginate(Coupon, query, {
            page,
            limit,
            sort: { createdAt: -1 }
        });


        res.render("admin/couponList", {
            coupons,
            pagination,
            search
        });
    } catch (error) {
        logger.error("Get Coupon List Error:", error);
        res.status(500).render("500", { error: error.message });
    }
};

export const renderAddCoupon = (req, res) => {
    res.render("admin/addCoupon");
};

export const createCoupon = async (req, res) => {
    try {
        const {
            description,
            couponCode,
            discountValue,
            discountType,
            startDate,
            expiryDate,
            minAmount,
            maxAmount
        } = req.body;

        const existingCoupon = await Coupon.findOne({ couponCode: couponCode.toUpperCase() });
        if (existingCoupon) {
            return res.status(400).json({ success: false, message: "Coupon code already exists" });
        }

        const newCoupon = new Coupon({
            description,
            couponCode: couponCode.toUpperCase(),
            discountValue,
            discountType,
            startDate,
            expiryDate,
            minAmount,
            maxAmount
        });

        await newCoupon.save();
        res.status(201).json({ success: true, message: "Coupon created successfully" });
    } catch (error) {
        logger.error("Create Coupon Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const renderEditCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.redirect("/admin/coupons");
        }
        res.render("admin/editCoupon", { coupon });
    } catch (error) {
        logger.error("Render Edit Coupon Error:", error);
        res.redirect("/admin/coupons");
    }
};

export const updateCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const {
            description,
            couponCode,
            discountValue,
            discountType,
            startDate,
            expiryDate,
            minAmount,
            maxAmount
        } = req.body;

        const existingCoupon = await Coupon.findById(id);
        if (!existingCoupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        let newStatus = existingCoupon.couponStatus;
        const now = new Date();
        const newExpiry = new Date(expiryDate);

        if (newExpiry < now) {
            newStatus = 'expired';
        } else if (existingCoupon.couponStatus === 'expired' && newExpiry > now) {
            newStatus = 'active';
        }

        const updatedCoupon = await Coupon.findByIdAndUpdate(id, {
            description,
            couponCode: couponCode.toUpperCase(),
            discountValue,
            discountType,
            startDate,
            expiryDate,
            minAmount,
            maxAmount,
            couponStatus: newStatus
        }, { new: true });

        if (!updatedCoupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        res.status(200).json({ success: true, message: "Coupon updated successfully" });
    } catch (error) {
        logger.error("Update Coupon Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedCoupon = await Coupon.findByIdAndDelete(id);
        if (!deletedCoupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }
        res.status(200).json({ success: true, message: "Coupon deleted successfully" });
    } catch (error) {
        logger.error("Delete Coupon Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export const toggleCouponStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const coupon = await Coupon.findById(id);
        if (!coupon) {
            return res.status(404).json({ success: false, message: "Coupon not found" });
        }

        coupon.couponStatus = coupon.couponStatus === "active" ? "blocked" : "active";
        await coupon.save();

        res.status(200).json({
            success: true,
            message: `Coupon ${coupon.couponStatus === "active" ? "activated" : "deactivated"} successfully`,
            status: coupon.couponStatus
        });
    } catch (error) {
        logger.error("Toggle Coupon Status Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};