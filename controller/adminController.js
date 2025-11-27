import { render } from 'ejs';
import {User} from '../models/userModel.js';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();
export const getLoginAdmin = (req,res)=>{
     if (req.session?.isAdmin) {
    return res.redirect("/admin/dashboard");
  }
  
    res.render('admin/adminLogin',{error:null});
}
export const postLoginAdmin = async(req,res)=>{
    const {email,password} = req.body;
    
    // Try both new and old environment variable names for backward compatibility
    const adminExist = {
        email: process.env.ADMIN_EMAIL || process.env.AdminMail,
        password: process.env.ADMIN_PASSWORD || process.env.AdminPassword
    }
    
    // Check if admin credentials are configured
    if(!adminExist.email || !adminExist.password){
        console.error("Admin credentials not configured in environment variables");
        console.error("Looking for: ADMIN_EMAIL, ADMIN_PASSWORD, AdminMail, or AdminPassword");
        return res.render('admin/adminLogin',{error:"Admin credentials not properly stored. Please check environment variables."});
    }
    
    if(adminExist.email === email && adminExist.password === password){
        req.session.isAdmin = true;
        req.session.adminEmail = email;
        return res.redirect("/admin/dashboard");
    }
    res.render('admin/adminLogin',{error:"invalid email or password"});
}

export const getAdminDashboard= async(req,res)=>{

    let users = await User.find();
    let admin = {
        email: process.env.ADMIN_EMAIL || process.env.AdminMail,
    }
    res.render("admin/dashboard",{users,admin});
}

export const getCustomerlist = async(req,res)=>{
   let users = await User.find();
    let admin = {
        email: process.env.ADMIN_EMAIL || process.env.AdminMail,
    }
    res.render("admin/customerList",{users,admin});
}


export const blockUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if user is already blocked
        if (user.isBlocked) {
            return res.status(400).json({
                success: false,
                message: "User is already blocked"
            });
        }

        // Block the user
        await User.findByIdAndUpdate(userId, { isBlocked: true });

        res.status(200).json({
            success: true,
            message: "User blocked successfully"
        });

    } catch (error) {
        console.error("Error blocking user:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};
export const unblockUser = async (req, res) => {
    try {
        const userId = req.params.id;

        // Check if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if user is already unblocked
        if (!user.isBlocked) {
            return res.status(400).json({
                success: false,
                message: "User is already unblocked"
            });
        }

        // Unblock the user
        await User.findByIdAndUpdate(userId, { isBlocked: false });

        res.status(200).json({
            success: true,
            message: "User unblocked successfully"
        });

    } catch (error) {
        console.error("Error unblocking user:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};

export const searchUsers = async(req,res)=>{
    let query = req.query.search;
    try{
        let admin = "Admin";
        const users = await User.find(
            {
                $or:[
                    {email:{$regex: query, $options:"i"}},
                    {name:{$regex: query, $options:"i"}},
                    {username:{$regex: query, $options:"i"}}
                ] 
            })
     
         if(req.xhr){
        return res.render("partials/userList", { users });
     }
        res.render("admin/adminHome",{admin, users});

    }
    catch(err){
        console.log("Search error");
        res.send("Internal Server error");
    }

}
export const adminLogout = (req,res)=>{
    req.session.destroy((err)=>{
        if(err)
        {
            return res.redirect('/admin/adminHome');
        }
        res.clearCookie("admin.id");
        res.redirect("/admin/login");
    })
}