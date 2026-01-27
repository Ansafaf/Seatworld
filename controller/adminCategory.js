import * as categoryService from '../services/adminCategoryService.js';
import logger from '../utils/logger.js';
import { Category } from '../models/categoryModel.js';
import { paginate } from '../utils/paginationHelper.js';
import { escapeRegExp } from '../utils/regexHelper.js';
import { status_Codes } from '../enums/statusCodes.js';
import { Message } from '../enums/message.js';

export const getCategoryList = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 7;
        const searchQuery = req.query.search || "";

        const query = {};
        if (searchQuery) {
            query.categoryName = { $regex: escapeRegExp(searchQuery), $options: "i" };
        }

        const { items: categories, pagination } = await paginate(Category, query, {
            page,
            limit,
            sort: { createdAt: -1 }
        });

        if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(200).json({
                success: true,
                categories,
                pagination,
                search: searchQuery
            });
        }

        res.render("admin/categoryList", {
            categories,
            pagination,
            search: searchQuery,
            currentPage: pagination.currentPage,
            limit: pagination.limit
        });
    } catch (error) {
        next(error);
    }
};

export const getAddCategory = (req, res) => {
    res.render("admin/addCategory");
}

export const postAddCategory = async (req, res, next) => {
    try {
        const { categoryName } = req.body;
        await categoryService.createCategory(categoryName);
        res.status(status_Codes.OK).json({ success: true, message: Message.CATEGORY.ADD, redirectUrl: "/admin/categories" });
    } catch (err) {
        next(err);
    }
}

export const getEditCategory = async (req, res, next) => {
    try {
        const { categoryId } = req.params;
        const category = await categoryService.getCategoryById(categoryId);

        if (!category) {
            req.session.message = { type: 'error', message: Message.CATEGORY.NOT_FOUND };
            return res.redirect("/admin/categories");
        }

        res.render("admin/editCategory", {
            category,
            breadcrumbs: [
                { label: "Dashboard", url: "/admin/dashboard" },
                { label: "Categories", url: "/admin/categories" },
                { label: "Edit Category", url: `/admin/edit-category/${id}` }
            ]
        });
    } catch (error) {
        next(error);
    }
};

export const postEditCategory = async (req, res, next) => {
    try {
        const { categoryName } = req.body;
        const { categoryId } = req.params;
        await categoryService.updateCategory(categoryId, categoryName);
        res.status(status_Codes.OK).json({ success: true, message: Message.CATEGORY.UPDATED_SUCCESS, redirectUrl: "/admin/categories" });
    } catch (err) {
        next(err);
    }
};

export const postBlockCategory = async (req, res, next) => {
    try {
        const { categoryId } = req.params;
        await categoryService.updateCategoryStatus(categoryId, false);
        res.status(status_Codes.OK).json({ success: true, message: Message.CATEGORY.BLOCK, redirectUrl: "/admin/categories" });
    } catch (error) {
        next(error);
    }
};

export const postUnblockCategory = async (req, res, next) => {
    try {
        const {categoryId} = req.params;
        await categoryService.updateCategoryStatus(categoryId, true);
        res.status(status_Codes.OK).json({ success: true, message: Message.CATEGORY.UNBLOCK, redirectUrl: "/admin/categories" });
    } catch (error) {
        next(error);
    }
};