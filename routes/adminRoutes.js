import express from 'express';
const adminRouter = express.Router();
import {getLoginAdmin,
    postLoginAdmin,
    getAdminDashboard,
    getCustomerlist,
    adminLogout,
    blockUser,
    unblockUser,
    searchUsers
} from '../controller/adminController.js';
import { productList } from "../controller/AdminproductController.js";
import  {adminAuthMiddleware} from '../middleware/adminAuthmiddle.js';

adminRouter.get("/login", getLoginAdmin);      
adminRouter.post("/login", postLoginAdmin); 


adminRouter.get("/dashboard",adminAuthMiddleware,getAdminDashboard);
adminRouter.get("/customers",getCustomerlist);

adminRouter.get("/logout", adminLogout);

adminRouter.patch("/block/:id", blockUser);
adminRouter.patch("/unblock/:id",unblockUser);

adminRouter.get("/search", searchUsers);
// adminRouter.get("/products", productList);

export default adminRouter;