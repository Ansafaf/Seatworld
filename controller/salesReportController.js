
import OrderItem from "../models/orderItemModel.js";
import PDFDocument from "pdfkit";
import Order from "../models/orderModel.js";
import { buildBreadcrumb } from "../utils/breadcrumb.js";
import { generateSalesReportData } from "../services/salesReportService.js";
import {
    generateHeader,
    generateReportDetails,
    generateSummary,
    generateTransactionTable,
    generateFooter
} from "../utils/salesReportPdfHelper.js";

export const getSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, quickFilter } = req.query;
        const reportData = await generateSalesReportData({ startDate, endDate, quickFilter });

        // Render View
        res.render("admin/salesreport", {
            salesData: reportData,
            filters: { startDate, endDate, quickFilter },
            breadcrumbs: buildBreadcrumb([
                { label: "Dashboard", url: "/admin/dashboard" },
                { label: "Sales Report", url: "/admin/sales-report" }
            ]),
            path: req.path
        });

    } catch (error) {
        console.error("Sales Report Error:", error);
        res.status(500).render("500", { message: "Failed to load sales report" });
    }
}

export const getDownloadSales = async (req, res) => {
    try {
        const { startDate, endDate, quickFilter } = req.query;
        const report = await generateSalesReportData({ startDate, endDate, quickFilter });

        const doc = new PDFDocument({ margin: 50 });

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", "attachment; filename=sales-report.pdf");

        doc.pipe(res);

        // 1. Header
        generateHeader(doc);

        // 2. Report Details
        let currentY = generateReportDetails(doc, report.dateRange.start, report.dateRange.end);

        // 3. Executive Summary
        currentY = generateSummary(doc, report, currentY);

        // 4. Transaction Details Table
        generateTransactionTable(doc, report.transactions, currentY);

        // 5. Footer
        generateFooter(doc);

        doc.end();

    } catch (err) {
        console.error("PDF Generation Error:", err);
        res.status(500).json({ message: "PDF generation failed" });
    }
};
