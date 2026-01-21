// ======================================
// SALES REPORT PDF HELPERS (FINAL)
// ======================================

const PAGE = {
    top: 50,
    bottom: 730,
    left: 50,
    right: 550
};

const GAP = {
    small: 8,
    medium: 16,
    large: 30,
    row: 22
};

// --------------------------------------
// Add New Page with Header
// --------------------------------------
function addNewPage(doc) {
    doc.addPage();
    generateHeader(doc);
    return PAGE.top + 60;
}

// --------------------------------------
// Header (All Pages)
// --------------------------------------
export function generateHeader(doc) {
    doc
        .fillColor("#333")
        .fontSize(20)
        .text("SeatWorld", PAGE.left, 35);

    doc
        .fontSize(10)
        .text("Admin Sales Report", PAGE.right - 200, 42, {
            width: 200,
            align: "right"
        });

    doc
        .strokeColor("#aaaaaa")
        .lineWidth(1)
        .moveTo(PAGE.left, 65)
        .lineTo(PAGE.right, 65)
        .stroke();
}

// --------------------------------------
// Report Details
// --------------------------------------
export function generateReportDetails(doc, startDate, endDate) {
    let y = 85;

    const start = startDate
        ? new Date(startDate).toLocaleDateString()
        : "Beginning";

    const end = endDate
        ? new Date(endDate).toLocaleDateString()
        : new Date().toLocaleDateString();

    doc.fontSize(10).fillColor("#444");
    doc.text(`Period: ${start} - ${end}`, PAGE.left, y);
    y += GAP.small + 4;
    doc.text(`Generated: ${new Date().toLocaleString()}`, PAGE.left, y);

    return y + GAP.large;
}

// --------------------------------------
// Executive Summary
// --------------------------------------
export function generateSummary(doc, report, startY) {
    let y = startY;

    doc.fontSize(14).fillColor("#333")
        .text("Executive Summary", PAGE.left, y);

    y += GAP.small + 6;

    doc.fontSize(9).fillColor("#666")
        .text("Includes paid/delivered orders only.", PAGE.left, y);

    y += GAP.large;

    doc.fontSize(10).fillColor("#333");

    doc.font("Helvetica-Bold").text("Gross Sales:", PAGE.left, y);
    doc.font("Helvetica").text(`Rs. ${Number(report.grossSales || 0).toLocaleString("en-IN")}`, PAGE.left + 90, y);

    doc.font("Helvetica-Bold").text("Total Orders:", 240, y);
    doc.font("Helvetica").text(report.totalOrders || 0, 340, y);

    doc.font("Helvetica-Bold").text("Total Discount:", 400, y);
    doc.font("Helvetica").text(`Rs. ${Number(report.totalDiscount || 0).toLocaleString("en-IN")}`, PAGE.right - 120, y, { width: 120, align: "right" });

    y += GAP.row;

    doc.font("Helvetica-Bold").text("Shipping Rev:", PAGE.left, y);
    doc.font("Helvetica").text(`Rs. ${Number(report.totalShipping || 0).toLocaleString("en-IN")}`, PAGE.left + 90, y);

    doc.font("Helvetica-Bold").text("Coupons Used:", 240, y);
    doc.font("Helvetica").text(report.couponsUsed || 0, 340, y);

    doc.font("Helvetica-Bold").text("Net Sales:", 400, y);
    doc.font("Helvetica").text(`Rs. ${Number(report.totalSales || 0).toLocaleString("en-IN")}`, PAGE.right - 120, y, { width: 120, align: "right" });

    return y + GAP.large + 10;
}

// --------------------------------------
// Transaction Table
// --------------------------------------
export function generateTransactionTable(doc, transactions, startY) {
    let y = startY;

    const COL = {
        id: 50,
        date: 105,
        customer: 165,
        items: 310,
        amount: 345,
        discount: 415,
        status: 485
    };

    doc.fontSize(12).fillColor("#333")
        .text("Transaction Details", PAGE.left, y);

    y += GAP.medium;

    function drawHeader() {
        doc.font("Helvetica-Bold").fontSize(8).fillColor("#333");

        doc.text("Order ID", COL.id, y);
        doc.text("Date", COL.date, y);
        doc.text("Customer", COL.customer, y);
        doc.text("Qty", COL.items, y, { width: 30, align: "center" });
        doc.text("Amount", COL.amount, y, { width: 65, align: "right" });
        doc.text("Discount", COL.discount, y, { width: 65, align: "right" });
        doc.text("Status", COL.status, y, { width: 65, align: "right" });

        y += 12;
        doc.moveTo(PAGE.left, y).lineTo(PAGE.right, y).stroke();
        y += GAP.row;

        doc.font("Helvetica");
    }

    drawHeader();

    if (!transactions || transactions.length === 0) {
        doc.fontSize(10)
            .text("No transactions found for this period.", PAGE.left, y);
        return;
    }

    transactions.forEach((t) => {
        if (y > PAGE.bottom - 20) {
            y = addNewPage(doc);
            drawHeader();
        }

        const dateStr = t.date
            ? new Date(t.date).toLocaleDateString('en-GB')
            : "-";

        doc.fontSize(7).fillColor("#333");
        doc.text(`#${String(t.orderId || "").slice(-6).toUpperCase()}`, COL.id, y);
        doc.text(dateStr, COL.date, y);

        // Customer Name & Email (truncate if needed)
        const customerInfo = `${t.customer?.name || "N/A"}\n${t.customer?.email || ""}`;
        doc.text(customerInfo, COL.customer, y, { width: 140, height: 16 });

        doc.text(String(t.itemCount || 0), COL.items, y, { width: 30, align: "center" });
        doc.text(`Rs. ${t.totalAmount || 0}`, COL.amount, y, { width: 65, align: "right" });
        doc.text(`Rs. ${t.discount || 0}`, COL.discount, y, { width: 65, align: "right" });
        doc.text(t.status || "Pending", COL.status, y, { width: 65, align: "right" });

        y += GAP.row;
    });

    y += GAP.medium;

    doc.moveTo(PAGE.left, y)
        .lineTo(PAGE.right, y)
        .strokeColor("#aaaaaa")
        .stroke();
}

// --------------------------------------
// Footer
// --------------------------------------
export function generateFooter(doc) {
    const pages = doc.bufferedPageRange();

    for (let i = 0; i < pages.count; i++) {
        doc.switchToPage(i);

        doc.moveTo(PAGE.left, 750)
            .lineTo(PAGE.right, 750)
            .strokeColor("#cccccc")
            .stroke();

        doc.fontSize(8).fillColor("#888");
        doc.text("Confidential - Internal Use Only", PAGE.left, 760);
        doc.text(`Page ${i + 1} of ${pages.count}`, PAGE.left, 760, {
            align: "right"
        });
    }
}
