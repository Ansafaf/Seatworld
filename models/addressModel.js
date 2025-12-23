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
        type:String
    },
    city:{
        type:String
    },
    state:{
        type:String
    },
    country:{
        type:String
    },
    pincode:{
        type:String
    },
    mobile:{
        type:String
    }
},{timestamps:true});

export const Address = mongoose.model("Address",addressSchema);
