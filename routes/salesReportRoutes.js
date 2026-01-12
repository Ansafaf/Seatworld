import express from "express";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { getDownloadSales, getSalesReport } from "../controller/salesReportController.js";
const salesRoute = express.Router();


salesRoute.get("/",adminAuthMiddleware, getSalesReport );
salesRoute.get("/download",adminAuthMiddleware,getDownloadSales);
export default salesRoute;