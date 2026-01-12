import { Offer } from '../models/offerModel.js';
import { Product } from '../models/productModel.js';
import { Category } from '../models/categoryModel.js';
import { buildBreadcrumb } from '../utils/breadcrumb.js';
import logger from '../utils/logger.js';

export const getOfferList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";

        let query = {};
        if (search) {
            query.name = { $regex: search, $options: 'i' };
        }

        const [offers, totalOffers] = await Promise.all([
            Offer.find(query)
                .populate('productId')
                .populate('categoryId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            Offer.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalOffers / limit);

        res.render("admin/offerList", {
            offers,
            path: '/admin/offers',
            search,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                totalItems: totalOffers
            }
        });

    } catch (error) {
        logger.error("Get Offer List Error:", error);
        res.status(500).render("500", { homeLink: '/admin/dashboard' });
    }
};

export const getAddOffer = async (req, res) => {
    try {
        const categories = await Category.find({ isActive: true });

        res.render("admin/offerAdd", {
            products: [], // Products will be searched via AJAX
            categories,
            path: '/admin/offers'
        });
    } catch (error) {
        logger.error("Get Add Offer Error:", error);
        res.status(500).render("500", { homeLink: '/admin/dashboard' });
    }
};

export const postAddOffer = async (req, res) => {
    try {
        const { name, offerType, productId, categoryId, discountPercentage } = req.body;

        const newOffer = new Offer({
            name,
            offerType,
            productId: offerType === 'Product' ? productId : undefined,
            categoryId: offerType === 'Category' ? categoryId : undefined,
            discountPercentage
        });

        await newOffer.save();

        // If it's a product offer, update the product
        if (offerType === 'Product') {
            await Product.findByIdAndUpdate(productId, { offerId: newOffer._id });
        }
        // Category offers could potentially updated the category too if needed
        // but often we just rely on the Offer model's reference.

        res.status(200).json({ success: true, message: "Offer added successfully" });
    } catch (error) {
        logger.error("Post Add Offer Error:", error);
        res.status(500).json({ success: false, message: "Failed to add offer" });
    }
};

export const toggleOfferStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await Offer.findById(id);
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        offer.isActive = !offer.isActive;
        await offer.save();

        res.status(200).json({
            success: true,
            message: `Offer ${offer.isActive ? 'activated' : 'blocked'} successfully`,
            isActive: offer.isActive
        });
    } catch (error) {
        logger.error("Toggle Offer Status Error:", error);
        res.status(500).json({ success: false, message: "Failed to toggle offer status" });
    }
};

export const getEditOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const offer = await Offer.findById(id).populate('productId');
        if (!offer) {
            return res.redirect("/admin/offers");
        }

        const categories = await Category.find({ isActive: true });

        res.render("admin/offerEdit", {
            offer,
            products: [], // Products search via AJAX
            categories,
            path: '/admin/offers'
        });
    } catch (error) {
        logger.error("Get Edit Offer Error:", error);
        res.status(500).render("500", { homeLink: '/admin/dashboard' });
    }
};

export const postEditOffer = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, offerType, productId, categoryId, discountPercentage } = req.body;

        const offer = await Offer.findById(id);
        if (!offer) {
            return res.status(404).json({ success: false, message: "Offer not found" });
        }

        // Handle product association changes if needed
        if (offer.offerType === 'Product' && offer.productId) {
            await Product.findByIdAndUpdate(offer.productId, { $unset: { offerId: "" } });
        }

        offer.name = name;
        offer.offerType = offerType;
        offer.productId = offerType === 'Product' ? productId : undefined;
        offer.categoryId = offerType === 'Category' ? categoryId : undefined;
        offer.discountPercentage = discountPercentage;

        await offer.save();

        if (offerType === 'Product') {
            await Product.findByIdAndUpdate(productId, { offerId: offer._id });
        }

        res.status(200).json({ success: true, message: "Offer updated successfully" });
    } catch (error) {
        logger.error("Post Edit Offer Error:", error);
        res.status(500).json({ success: false, message: "Failed to update offer" });
    }
};
