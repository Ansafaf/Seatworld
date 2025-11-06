import { render } from 'ejs';
import {User} from '../models/userModel.js';
import bcrypt from 'bcrypt';
export const getLoginAdmin = (req,res)=>{
    res.render('admin/adminLogin',{error:null});
}
export const postLoginAdmin = async(req,res)=>{
    const {email,password} = req.body;
    const adminExist = {
        email:process.env.AdminMail,
        password:process.env.AdminPassword
    }
    console.log(adminExist)
    if(adminExist.email == email && adminExist.password == password){
         
        return res.redirect("/admin/dashboard");
    }
    res.render('admin/adminLogin',{error:"invalid email or password"});
}

export const getAdminDashboard= async(req,res)=>{

    let users = await User.find();
    let admin = {
        email:process.env.AdminMail,
        password:process.env.AdminPassword
    }
    res.render("admin/dashboard",{users,admin});
}

export const getCustomerlist = async(req,res)=>{
   let users = await User.find();
    let admin = {
        email:process.env.AdminMail,
        password:process.env.AdminPassword
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