import { Offer } from '../models/offerModel.js';
import { Product } from '../models/productModel.js';
import { Category } from '../models/categoryModel.js';
import { buildBreadcrumb } from '../utils/breadcrumb.js';
import logger from '../utils/logger.js';
import mongoose from "mongoose";
import { escapeRegExp } from '../utils/regexHelper.js';

export const getOfferList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 8;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";

        let query = {};
        if (search) {
            const escapedSearch = escapeRegExp(search);

            // Find products/categories matching the search to expand offer search
            const [products, categories] = await Promise.all([
                Product.find({
                    $or: [
                        { name: { $regex: escapedSearch, $options: 'i' } },
                        { brand: { $regex: escapedSearch, $options: 'i' } }
                    ]
                }).select('_id'),
                Category.find({ categoryName: { $regex: escapedSearch, $options: 'i' } }).select('_id')
            ]);

            const productIds = products.map(p => p._id);
            const categoryIds = categories.map(c => c._id);

            const searchConditions = [
                { name: { $regex: escapedSearch, $options: 'i' } },
                { offerType: { $regex: escapedSearch, $options: 'i' } },
                { productId: { $in: productIds } },
                { categoryId: { $in: categoryIds } }
            ];

            // Try matching discount if search is a number
            const searchNum = parseFloat(search);
            if (!isNaN(searchNum)) {
                searchConditions.push({ discountPercentage: searchNum });
            }

            query.$or = searchConditions;
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
                limit,
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

        if (!mongoose.Types.ObjectId.isValid(productId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid product ID"
            });
        }

        if (discountPercentage >= 50) {
            return res.status(400).json({ success: false, message: "discount percentage must be less than 50" })
        }
        
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
         if (discountPercentage >= 50) {
            return res.status(400).json({ success: false, message: "discount percentage must be less than 50" })
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
