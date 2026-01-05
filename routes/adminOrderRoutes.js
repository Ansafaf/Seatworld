import express from "express";
const adminRouter = express.Router();
import {adminAuthMiddleware} from "../middleware/adminAuthMiddleware.js";
import { getOrderlist } from "../controller/adminOrderController.js";

adminRouter.get("/",adminAuthMiddleware,getOrderlist);

export default adminRouter;