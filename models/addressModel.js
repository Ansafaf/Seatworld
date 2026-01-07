import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    isDefault:{
        type:Boolean,
        default:false
    },
    name:{
        type:String,
        required:true
    },
    housename:{
        type:String
    },
    street:{
        type:String,
        required:true

    },
    city:{
        type:String,
        required:true
    },
    state:{
        type:String,
        required:true
    },
    country:{
        type:String,
        required:true
    },
    pincode:{
        type:String,
        required:true
    },
    mobile:{
        type:String,
        required:true
    }
},{timestamps:true});

export const Address = mongoose.model("Address",addressSchema);
