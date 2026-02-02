import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    categoryName:{
        type:String,
        required:true,
        unique: true
    },
    isActive:{
        type:Boolean,
        default:true
    }

},{timestamps:true})

categorySchema.index({ categoryName: 1 }, { unique: true });

export const Category = mongoose.model("Category",categorySchema);