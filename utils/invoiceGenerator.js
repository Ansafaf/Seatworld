import PDFDocument from "pdfkit";
import Buffer from "buffer";

export default function generateInvoicePDF(order, items) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });

    const leftMargin = 50;
    const rightMargin = 545; // A4 width (595) - margin (50)

    // ====== HEADER SECTION ======
    doc.fillColor("#1f2937").fontSize(20).font("Helvetica-Bold").text("SeatWorld", leftMargin, 50);

    doc.fillColor("#4b5563").fontSize(10).font("Helvetica");
    doc.text("INVOICE", leftMargin, 80);
    doc.fillColor("#1f2937").fontSize(11).font("Helvetica-Bold").text(`#${order._id.toString().slice(-6).toUpperCase()}`, leftMargin, 95);

    doc.fillColor("#4b5563").fontSize(10).font("Helvetica").text("DATE", rightMargin - 150, 80, { align: "right", width: 150 });
    doc.fillColor("#1f2937").fontSize(11).font("Helvetica-Bold").text(new Date(order.createdAt).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    }), rightMargin - 150, 95, { align: "right", width: 150 });

    doc.moveDown(2);

    // separator line
    doc.moveTo(leftMargin, 120).lineTo(rightMargin, 120).lineWidth(1).strokeColor("#e5e7eb").stroke();

    doc.moveDown(1.5);

    // ====== INFO GRID (ADDRESS & ORDER INFO) ======
    const currentY = doc.y;

    // Shipping Address
    const addr = order.shippingAddress;
    doc.fillColor("#4b5563").fontSize(10).font("Helvetica-Bold").text("BILL TO:", leftMargin, currentY);
    doc.moveDown(0.3);
    doc.fillColor("#1f2937").fontSize(10).font("Helvetica-Bold").text(addr.name.toUpperCase());
    doc.font("Helvetica").text(`${addr.housename}, ${addr.street}`);
    doc.text(`${addr.city}, ${addr.state}`);
    doc.text(`${addr.pincode}, ${addr.country}`);
    doc.text(`Phone: ${addr.mobile}`);

    // Order Info
    doc.fillColor("#4b5563").fontSize(10).font("Helvetica-Bold").text("ORDER DETAILS:", rightMargin - 150, currentY, { width: 150, align: "right" });
    doc.moveDown(0.3);
    doc.fillColor("#1f2937").fontSize(10).font("Helvetica").text(`Status: ${order.orderStatus || 'Confirmed'}`, rightMargin - 150, doc.y, { width: 150, align: "right" });
    doc.text(`Payment: ${order.paymentMethod}`, rightMargin - 150, doc.y, { width: 150, align: "right" });

    doc.moveDown(3);

    // ====== PRODUCT TABLE ======
    const tableHeaderY = doc.y;
    const col1X = leftMargin; // Product
    const col2X = 300; // Price
    const col3X = 400; // Qty
    const col4X = 475; // Total
    const colWidths = { p: 240, pr: 90, q: 60, t: 70 };

    // Table Header Background
    doc.rect(leftMargin, tableHeaderY - 5, rightMargin - leftMargin, 25).fill("#f9fafb");

    doc.fillColor("#4b5563").fontSize(10).font("Helvetica-Bold");
    doc.text("PRODUCT", col1X, tableHeaderY);
    doc.text("PRICE", col2X, tableHeaderY, { width: colWidths.pr, align: "right" });
    doc.text("QTY", col3X, tableHeaderY, { width: colWidths.q, align: "right" });
    doc.text("TOTAL", col4X, tableHeaderY, { width: colWidths.t, align: "right" });

    doc.moveDown(1);
    let itemY = doc.y + 10;

    // Table Items
    doc.font("Helvetica").fontSize(10).fillColor("#1f2937");
    let calculatedSubtotal = 0;

    items.forEach((item, index) => {
      const itemName = item.name || item.variantId?.productId?.name || "Product";
      const variant = item.variantLabel ? ` (${item.variantLabel})` : "";
      const price = parseFloat(item.purchasedPrice || 0);
      const qty = parseInt(item.productQuantity || 1);
      const total = price * qty;
      calculatedSubtotal += total;

      // Wrap text for product name if too long
      doc.text(itemName + variant, col1X, itemY, { width: colWidths.p });
      doc.text(`INR ${price.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col2X, itemY, { width: colWidths.pr, align: "right" });
      doc.text(qty.toString(), col3X, itemY, { width: colWidths.q, align: "right" });
      doc.text(`INR ${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col4X, itemY, { width: colWidths.t, align: "right" });

      itemY = doc.y + 15;

      // Separator Line
      doc.moveTo(leftMargin, itemY - 5).lineTo(rightMargin, itemY - 5).lineWidth(0.5).strokeColor("#f3f4f6").stroke();
      itemY += 10;
    });

    doc.moveDown(1.5);

    // ====== SUMMARY SECTION ======
    const summaryY = doc.y + 10;
    const summaryLabelX = col3X - 50;
    const summaryValueWidth = colWidths.t + 25;

    doc.fontSize(10).fillColor("#4b5563");

    // Subtotal
    doc.text("Subtotal", summaryLabelX, summaryY);
    doc.fillColor("#1f2937").text(`INR ${(order.subtotal || calculatedSubtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col4X - 25, summaryY, { width: summaryValueWidth, align: "right" });

    // Shipping
    doc.fillColor("#4b5563").text("Shipping", summaryLabelX, doc.y + 10);
    doc.fillColor("#1f2937").text(`INR ${parseFloat(order.shippingFee || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col4X - 25, doc.y - 10, { width: summaryValueWidth, align: "right" });

    // Discount
    if (order.discountAmount > 0) {
      doc.fillColor("#065f46").text("Discount", summaryLabelX, doc.y + 10);
      doc.text(`-INR ${parseFloat(order.discountAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col4X - 25, doc.y - 10, { width: summaryValueWidth, align: "right" });
    }

    // Grand Total
    const grandTotalY = doc.y + 15;
    doc.rect(summaryLabelX - 5, grandTotalY - 8, rightMargin - summaryLabelX + 5, 30).fill("#1f2937");
    doc.fillColor("#ffffff").fontSize(11).font("Helvetica-Bold").text("GRAND TOTAL", summaryLabelX, grandTotalY);
    doc.text(`INR ${parseFloat(order.totalAmount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, col4X - 25, grandTotalY, { width: summaryValueWidth, align: "right" });

    // ====== FOOTER ======
    doc.fillColor("#9ca3af").fontSize(8).font("Helvetica").text("This is a computer-generated invoice and no signature is required.", leftMargin, 780, { align: "center", width: rightMargin - leftMargin });
    doc.text("Thank you for shopping with SeatWorld!", leftMargin, 792, { align: "center", width: rightMargin - leftMargin });

    doc.end();
  });
}