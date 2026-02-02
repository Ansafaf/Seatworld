import { status_Codes } from '../enums/statusCodes.js';
import { Category } from '../models/categoryModel.js';

export const getCategories = async (query = {}, skip, limit) => {
    return await Category.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
};

export const getCategoryCount = async (query = {}) => {
    return await Category.countDocuments(query);
};

export const createCategory = async (name) => {
    try{
         const category = new Category({ categoryName: name });
         return await category.save();
    }
    catch(error){
        if(error.code === 11000){
            throw{
                status: status_Codes.CONFLICT,
                message:"Category already exist"
            }
        }
    }
};

export const updateCategory = async (id, name) => {
    try{
        return await Category.findByIdAndUpdate(id, { categoryName: name.trim() },{new : true});
    }
    catch(error){
        if(error.code === 11000){
            throw{
                status: status_Codes.CONFLICT,
                message:"Category already exist"
            }
        }

    }
    
};

export const updateCategoryStatus = async (id, isActive) => {
    return await Category.findByIdAndUpdate(id, { isActive }, { new: true });
};

export const getCategoryById = async (id) => {
    return await Category.findById(id);
};

export const getActiveCategories = async () => {
    return await Category.find({ isActive: true }).select("_id categoryName");
}
