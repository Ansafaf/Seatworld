import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    brand:{
        type:String,
        required:true,
    },
    tags:{
        type:[String]
    },
    price:{
        type:Number,
        required:true
    },
    description:{
        type:String,
        required:false
    },
    offerId:{
        type:mongoose.Schema.Types.ObjectId,
        ref: "Offer"
    },
    categoryId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Category",
        required:true
    }
}, {timestamps:true});  // ✅ Fixed: Added closing brace

export const Product = mongoose.model("Product", productSchema);

// Product variant schema structure
const productVariantSchema = new mongoose.Schema({
    productId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Product",
        required:true
    },
    color:{
        type:String,
        required:true
    },
    stock:{
        type:Number,
        default:0
    },
    price:{
        type:Number,
        required:true
    },
    status:{
        type:String,
        enum:["Active","OutofStock","Hidden"],
        default:"Active"
    },
    images:{
        type:[String],
        default:[]
    }
}, {timestamps:true});

export const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);