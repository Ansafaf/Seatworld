import PDFDocument from "pdfkit";

export default function generateInvoicePDF(order, items) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });

    const pageWidth = doc.page.width - 100; // Account for margins
    const leftMargin = 50;
    const rightMargin = doc.page.width - 50;

    // ====== COMPANY HEADER ======
    doc.fontSize(24).font("Helvetica-Bold").text("SeatWorld", { align: "center" });
    doc.moveDown(0.3);

    // Horizontal line below header
    doc.moveTo(leftMargin, doc.y)
      .lineTo(rightMargin, doc.y)
      .stroke();
    doc.moveDown(1.5);

    // ====== ORDER SUMMARY ======
    const orderStatus = order.orderStatus || "Pending";
    doc.fontSize(16)
      .font("Helvetica-Bold")
      .text(`Order Summary (${orderStatus})`, { align: "center" });
    doc.moveDown(0.8);

    doc.fontSize(11).font("Helvetica");
    doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })}`);
    doc.text(`Status: ${orderStatus}`);
    doc.moveDown(1.2);

    // ====== SHIPPING ADDRESS ======
    const addr = order.shippingAddress;
    doc.fontSize(12).font("Helvetica-Bold").text("Shipping Address:");
    doc.moveDown(0.3);
    doc.fontSize(10).font("Helvetica");
    doc.text(addr.name.toUpperCase());
    doc.text(`${addr.housename}, ${addr.street}`);
    doc.text(`${addr.city}, ${addr.state}`);
    doc.text(`${addr.pincode}, ${addr.country}`);
    doc.text(`Phone: ${addr.mobile}`);
    doc.moveDown(1.5);

    // ====== PRODUCT TABLE ======
    const tableTop = doc.y;
    const col1X = leftMargin; // Product name
    const col2X = leftMargin + 280; // Price
    const col3X = leftMargin + 370; // Qty
    const col4X = leftMargin + 450; // Total

    // Table Headers
    doc.fontSize(11).font("Helvetica-Bold");
    doc.text("Product", col1X, tableTop, { width: 270, align: "left" });
    doc.text("Price", col2X, tableTop, { width: 80, align: "right" });
    doc.text("Qty", col3X, tableTop, { width: 70, align: "right" });
    doc.text("Total", col4X, tableTop, { width: 90, align: "right" });

    let currentY = tableTop + 20;
    doc.moveDown(0.5);

    // Table Rows
    doc.font("Helvetica").fontSize(10);
    let subtotal = 0;

    items.forEach((item) => {
      const itemName = item.name || item.variantId?.productId?.name || "Product";
      const variant = item.variantId?.size ? ` (${item.variantId.size})` : "";
      const fullName = itemName + variant;
      const price = parseFloat(item.purchasedPrice || 0);
      const quantity = parseInt(item.productQuantity || 1);
      const itemTotal = price * quantity;
      subtotal += itemTotal;

      doc.text(fullName, col1X, currentY, { width: 270, align: "left" });
      doc.text(price.toFixed(2), col2X, currentY, { width: 80, align: "right" });
      doc.text(quantity.toString(), col3X, currentY, { width: 70, align: "right" });
      doc.text(itemTotal.toFixed(2), col4X, currentY, { width: 90, align: "right" });

      currentY += 25;
    });

    doc.moveDown(1);
    currentY = doc.y;

    // ====== SUMMARY SECTION ======
    const summaryX = col3X - 50; // Align with right side
    const valueX = col4X;

    doc.fontSize(10).font("Helvetica");

    // Subtotal
    doc.text("Subtotal:", summaryX, currentY, { width: 100, align: "left" });
    doc.text((order.subtotal || subtotal).toFixed(2), valueX, currentY, { width: 90, align: "right" });
    currentY += 18;

    // Shipping
    const shipping = parseFloat(order.shippingFee || 0);
    doc.text("Shipping:", summaryX, currentY, { width: 100, align: "left" });
    doc.text(shipping.toFixed(2), valueX, currentY, { width: 90, align: "right" });
    currentY += 18;

    // Discount
    if (order.discountAmount > 0) {
      doc.fillColor("#2e7d32");
      doc.text("Discount:", summaryX, currentY, { width: 100, align: "left" });
      doc.text(`-${order.discountAmount.toFixed(2)}`, valueX, currentY, { width: 90, align: "right" });
      doc.fillColor("black");
      currentY += 18;
    }

    // Horizontal line above total
    doc.moveTo(summaryX, currentY + 5)
      .lineTo(rightMargin, currentY + 5)
      .stroke();
    currentY += 15;

    // Payable Amount (Bold)
    doc.fontSize(12).font("Helvetica-Bold");
    doc.text("Payable Amount:", summaryX, currentY, { width: 100, align: "left" });
    doc.text(parseFloat(order.totalAmount).toFixed(2), valueX, currentY, { width: 90, align: "right" });

    doc.end();
  });
}