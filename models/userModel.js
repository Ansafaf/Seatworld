import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    googleId: { type: String, unique: true, sparse: true },
    name: {type:String}, //names comes from google
    email:{
        type:String,
        required:true,
        unique:true,
    },
    avatar: String,   //profile picture fetched from google ac
    mobile:{
        type:String,
        sparse: true,
        unique:true
    },
    username:{
        type:String
    },
    password:{
        type:String
    },
    status: {
      type: String,
      enum: ["active", "blocked"],
      default: "active"
    },
    isVerified:{
        type:Boolean,
        default:false
    },
    authType: {
      type: String,
      enum: ["local", "google"],
      default: "local"
    }
},{timestamps:true})

export const User = mongoose.model('User',userSchema);