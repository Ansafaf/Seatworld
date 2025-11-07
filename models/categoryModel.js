import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    categoryName:{
        type:String,
        required:true
    },
    isActive:{
        type:Boolean,
        default:true
    }

},{timestamps:true})

export const Category = mongoose.model("Category",categorySchema);