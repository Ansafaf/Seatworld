import express from 'express';
const adminRouter = express.Router();
import {
    getLoginAdmin,
    postLoginAdmin,
    getAdminDashboard,
    getCustomerlist,
    adminLogout,
    blockUser,
    unblockUser,
    searchUsers
} from '../controller/adminController.js';
import { adminAuthMiddleware } from '../middleware/adminAuthmiddle.js';

adminRouter.get("/login", getLoginAdmin);
adminRouter.post("/login", postLoginAdmin);


adminRouter.get("/dashboard", adminAuthMiddleware, getAdminDashboard);

adminRouter.get("/logout", adminLogout);

adminRouter.get("/users",adminAuthMiddleware,getCustomerlist);
adminRouter.get("/users/:id/block", adminAuthMiddleware,blockUser);
adminRouter.patch("/users/:id/block", adminAuthMiddleware,blockUser);
adminRouter.get("/users/:id/unblock", adminAuthMiddleware,unblockUser);
adminRouter.patch("/users/:id/unblock", adminAuthMiddleware,unblockUser);


adminRouter.get("/search", adminAuthMiddleware,searchUsers);


export default adminRouter;