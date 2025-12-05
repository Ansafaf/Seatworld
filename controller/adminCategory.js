import {Category} from '../models/categoryModel.js';

export const getCategoryList = async (req, res) => {
    try {
        const categories = await Category.find();
        res.render("admin/categoryList",{categories});
    } catch (error) {
        res.status(500).json({ message: "Error fetching categories" });
    }
};
export const getAddCategory =(req,res)=>{
    res.render("admin/addCategory");
}
export const postAddCategory = async (req,res) =>{
    try{
        const {categoryName} = req.body;
        const category = new Category({categoryName: categoryName});
        await category.save();
        res.redirect("/admin/categories");
    }
    catch(err){
        console.log(err);
        res.status(500).render("admin/addCategory", { error: "Error adding category. Please try again." });
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

        res.redirect("/admin/categories");
    } catch (err) {
        console.log(err);
        res
            .status(500)
            .render("admin/editCategory", { error: "Error updating category. Please try again." });
    }
};
