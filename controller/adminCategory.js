import { Category } from '../models/categoryModel.js';

export const getCategoryList = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 5;
        const skip = (page - 1) * limit;

        const totalCategories = await Category.countDocuments();
        const totalPages = Math.ceil(totalCategories / limit);

        const categories = await Category.find()
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        res.render("admin/categoryList", {
            categories,
            currentPage: page,
            totalPages,
            totalCategories,
            limit
        });
    } catch (error) {
        console.error("Error fetching categories:", error);
        res.status(500).json({ message: "Error fetching categories" });
    }
};


export const getAddCategory = (req, res) => {
    res.render("admin/addCategory");
}
export const postAddCategory = async (req, res) => {
    try {
        const { categoryName } = req.body;
        const category = new Category({ categoryName: categoryName });
        await category.save();
        req.session.message = { type: 'success', message: "Category added successfully" };
        res.redirect("/admin/categories");
    }
    catch (err) {
        console.log(err);
        req.session.message = { type: 'error', message: "Error adding category. Please try again." };
        res.redirect("/admin/add-category");
    }
}
export const getEditCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const category = await Category.findById(id);
        console.log(category);
        if (!category) {
            return res
                .status(404)
                .render("admin/editCategory", { error: "Category not found" });
        }

        res.render("admin/editCategory", { category });
    } catch (error) {
        console.log(error);
        res.status(500).render("admin/editCategory", { error: "Something went wrong" });
    }
};

export const postEditCategory = async (req, res) => {
    try {
        const { categoryName } = req.body;
        const { id } = req.params;

        await Category.findByIdAndUpdate(id, { categoryName: categoryName.trim() });

        req.session.message = { type: 'success', message: "Category updated successfully" };
        res.redirect("/admin/categories");
    } catch (err) {
        console.log(err);
        req.session.message = { type: 'error', message: "Error updating category. Please try again." };
        res.redirect(`/admin/edit-category/${req.params.id}`);
    }
};

export const postBlockCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await Category.findByIdAndUpdate(id, { isActive: false });
        req.session.message = { type: 'success', message: "Category blocked successfully" };
        res.redirect("/admin/categories");
    } catch (error) {
        console.error("Error blocking category:", error);
        req.session.message = { type: 'error', message: "Error blocking category" };
        res.redirect("/admin/categories");
    }
};
export const postUnblockCategory = async (req, res) => {
    try {
        const { id } = req.params;
        await Category.findByIdAndUpdate(id, { isActive: true });
        req.session.message = { type: 'success', message: "Category unblocked successfully" };
        res.redirect("/admin/categories");
    } catch (error) {
        console.error("Error unblocking category:", error);
        req.session.message = { type: 'error', message: "Error unblocking category" };
        res.redirect("/admin/categories");
    }
};
