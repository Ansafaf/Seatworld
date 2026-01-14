import express from "express";
import { adminAuthMiddleware } from "../middleware/adminAuthMiddleware.js";
import { getDownloadExcel, getDownloadSales, getSalesReport } from "../controller/salesReportController.js";
const salesRoute = express.Router();


salesRoute.get("/", adminAuthMiddleware, getSalesReport);
salesRoute.get("/download", adminAuthMiddleware, getDownloadSales);
salesRoute.get("/download-excel", adminAuthMiddleware, getDownloadExcel);
export default salesRoute;