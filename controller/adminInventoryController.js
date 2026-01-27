import { Message } from "../enums/message.js";
import { status_Codes } from "../enums/statusCodes.js";
import { Product, ProductVariant } from "../models/productModel.js";
import StockHistory from "../models/stockHistoryModel.js";
import * as inventoryService from "../services/inventoryService.js";
import logger from "../utils/logger.js";
import { escapeRegExp } from "../utils/regexHelper.js";

export const getInventoryList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 7;
        const skip = (page - 1) * limit;
        const search = req.query.search || "";
        const statusFilter = req.query.status || "";

        let query = {};

        if (search) {
            const escapedSearch = escapeRegExp(search);
            const products = await Product.find({
                $or: [
                    { name: { $regex: escapedSearch, $options: "i" } },
                    { brand: { $regex: escapedSearch, $options: "i" } }
                ]
            }).select("_id");
            query.productId = { $in: products.map(p => p._id) };
        }

        const totalVariants = await ProductVariant.countDocuments(query);
        const totalPages = Math.ceil(totalVariants / limit);

        const variants = await ProductVariant.find(query)
            .populate("productId", "name brand")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        let formattedInventory = variants.map(variant => {
            const status = inventoryService.getStockStatus(variant.stock, variant.lowStockThreshold);
            return {
                ...variant,
                productName: variant.productId?.name || "Unknown",
                brand: variant.productId?.brand || "N/A",
                stockLabel: status.label,
                stockColor: status.color,
                statusCode: status.code // e.g., 'in_stock', 'low_stock', 'out_of_stock'
            };
        });

        if (statusFilter) {
            formattedInventory = formattedInventory.filter(item => item.statusCode === statusFilter);
        }

        res.render("admin/inventoryList", {
            inventory: formattedInventory,
            pagination: {
                currentPage: page,
                totalPages,
                hasNextPage: page < totalPages,
                hasPrevPage: page > 1,
                limit
            },
            filters: {
                search,
                status: statusFilter
            }
        });
    } catch (error) {
        logger.error(`Error fetching inventory list: ${error.message}`);
        res.status(status_Codes.INTERNAL_SERVER_ERROR).render("500", { message: Message.COMMON.INTERNAL_SERVER });
    }
};

export const updateStockManually = async (req, res) => {
    try {
        const { variantId, quantity, type, reason, notes } = req.body;
        const changeAmount = type === "increment" ? parseInt(quantity) : -parseInt(quantity);

        await inventoryService.updateStock({
            variantId,
            quantity: changeAmount,
            reason: reason || "admin_edit",
            notes: notes || "Manual stock adjustment",
            adminId: req.session.adminId
        });

        const updatedVariant = await ProductVariant.findById(variantId).lean();
        const status = inventoryService.getStockStatus(updatedVariant.stock, updatedVariant.lowStockThreshold);

        res.json({
            success: true,
            message: "Stock updated successfully",
            newStock: updatedVariant.stock,
            stockLabel: status.label,
            stockColor: status.color,
            statusCode: status.code
        });
    } catch (error) {
        logger.error(`Error manual stock update: ${error.message}`);
        res.status(status_Codes.BAD_REQUEST).json({ success: false, message: error.message });
    }
};

export const getStockHistory = async (req, res) => {
    try {
        const { variantId } = req.params;
        const history = await StockHistory.find({ variantId })
            .sort({ createdAt: -1 })
            .limit(20)
            .lean();

        res.json({ success: true, history });
    } catch (error) {
        res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Error fetching history" });
    }
};