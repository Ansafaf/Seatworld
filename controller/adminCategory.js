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
        const category = new Category({name: categoryName});
        await category.save();
        res.status(201).json({ message: "Category added successfully" });
    }
    catch(err){
        console.log(err);
        res.status(500).json({ message: "Error adding category" });
    }
}

export const getEditCategory = (req,res){
    res.render("admin/editCategory");
}
export const postEditCategory = async (req,res) =>{
    try{
        const {categoryName} = req.body;
        const {id} = req.params;
        await Category.findByIdAndUpdate(id,{name:categoryName});
        res.status(200).json({ message: "Category updated successfully" });
    }
    catch(err){
        console.log(err);
        res.status(500).json({ message: "Error updating category" });
    }
}
