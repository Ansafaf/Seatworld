
import OrderItem from "../models/orderItemModel.js";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
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

export const getDownloadExcel = async (req, res) => {
    try {
        const { startDate, endDate, quickFilter } = req.query;
        const report = await generateSalesReportData({ startDate, endDate, quickFilter });

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        // Define columns
        worksheet.columns = [
            { header: 'Order ID', key: 'orderId', width: 25 },
            { header: 'Date', key: 'date', width: 15 },
            { header: 'Customer', key: 'customer', width: 25 },
            { header: 'Items', key: 'items', width: 10 },
            { header: 'Subtotal (₹)', key: 'subtotal', width: 15 },
            { header: 'Shipping (₹)', key: 'shipping', width: 15 },
            { header: 'Discount (₹)', key: 'discount', width: 15 },
            { header: 'Total (₹)', key: 'totalAmount', width: 15 },
            { header: 'Payment Method', key: 'paymentMethod', width: 20 },
            { header: 'Status', key: 'status', width: 15 }
        ];

        // Format header row
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(1).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFE0E0E0' }
        };

        // Add data rows
        report.transactions.forEach(t => {
            worksheet.addRow({
                orderId: `#${t.orderId.toString().slice(-6).toUpperCase()}`,
                date: new Date(t.date).toLocaleDateString('en-IN'),
                customer: `${t.customer.name} (${t.customer.email})`,
                items: t.itemCount,
                subtotal: t.subtotal,
                shipping: t.shippingFee,
                discount: t.discount,
                totalAmount: t.totalAmount,
                paymentMethod: t.paymentMethod,
                status: t.status
            });
        });

        // Add summary section at the bottom
        worksheet.addRow([]);
        worksheet.addRow(['Summary']);
        worksheet.getRow(worksheet.rowCount).font = { bold: true, size: 12 };

        worksheet.addRow(['Total Orders', report.totalOrders]);
        worksheet.addRow(['Gross Sales', report.grossSales]);
        worksheet.addRow(['Total Discount', report.totalDiscount]);
        worksheet.addRow(['Shipping Fees', report.totalShipping]);
        worksheet.addRow(['Net Sales', report.totalSales]);
        worksheet.addRow(['Refunded Amount', report.totalRefunded]);
        worksheet.addRow(['Coupons Used', report.couponsUsed]);
        worksheet.addRow(['Avg Order Value', report.avgOrderValue]);

        res.setHeader(
            'Content-Type',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
        res.setHeader(
            'Content-Disposition',
            'attachment; filename=sales-report.xlsx'
        );

        await workbook.xlsx.write(res);
        res.end();

    } catch (err) {
        console.error("Excel Generation Error:", err);
        res.status(500).json({ message: "Excel generation failed" });
    }
};
