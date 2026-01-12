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

    doc.font("Helvetica-Bold")
        .text("Total Sales:", PAGE.left, y);
    doc.font("Helvetica")
        .text(
            `Rs. ${Number(report.totalSales || 0).toLocaleString("en-IN")}`,
            PAGE.left + 90,
            y
        );

    doc.font("Helvetica-Bold")
        .text("Total Orders:", 240, y);
    doc.font("Helvetica")
        .text(report.totalOrders || 0, 340, y);

    doc.font("Helvetica-Bold")
        .text("Total Discount:", 400, y);
    doc.font("Helvetica")
        .text(
            `Rs. ${Number(report.totalDiscount || 0).toLocaleString("en-IN")}`,
            PAGE.right - 120,
            y,
            { width: 120, align: "right" }
        );

    return y + GAP.large + 10;
}

// --------------------------------------
// Transaction Table
// --------------------------------------
export function generateTransactionTable(doc, transactions, startY) {
    let y = startY;

    const COL = {
        id: 50,
        date: 140,
        amount: 260,
        discount: 350,
        payment: 440
    };

    doc.fontSize(12).fillColor("#333")
        .text("Transaction Details", PAGE.left, y);

    y += GAP.medium;

    function drawHeader() {
        doc.font("Helvetica-Bold").fontSize(9).fillColor("#333");

        doc.text("Order ID", COL.id, y);
        doc.text("Date", COL.date, y);
        doc.text("Amount", COL.amount, y, { width: 80, align: "right" });
        doc.text("Discount", COL.discount, y, { width: 80, align: "right" });
        doc.text("Payment Info", COL.payment, y, { width: 110, align: "right" });

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
        if (y > PAGE.bottom) {
            y = addNewPage(doc);
            drawHeader();
        }

        const dateStr = t.date
            ? new Date(t.date).toLocaleDateString()
            : "-";

        let payMethod = (t.paymentMethod || "").toLowerCase();
        if (payMethod.includes("razorpay") || payMethod.includes("online")) {
            payMethod = "Credit or Debit";
        } else if (payMethod.includes("cod")) {
            payMethod = "COD";
        } else if (payMethod.includes("wallet")) {
            payMethod = "Wallet";
        } else {
            payMethod = payMethod ? payMethod.toUpperCase() : "N/A";
        }

        doc.fontSize(9).fillColor("#333");
        doc.text(String(t.orderId || "").substring(0, 12), COL.id, y);
        doc.text(dateStr, COL.date, y);
        doc.text(`Rs. ${t.totalAmount || 0}`, COL.amount, y, { width: 80, align: "right" });
        doc.text(`Rs. ${t.discount || 0}`, COL.discount, y, { width: 80, align: "right" });
        doc.text(payMethod, COL.payment, y, { width: 110, align: "right" });

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
