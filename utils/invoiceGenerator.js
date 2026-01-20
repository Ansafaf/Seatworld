import PDFDocument from "pdfkit";
import { Buffer } from "buffer";

export default function generateInvoicePDF(order, items) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50, size: "A4" });
      const buffers = [];

      // Stream listeners
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => {
        try {
          resolve(Buffer.concat(buffers));
        } catch (bufferError) {
          reject(bufferError);
        }
      });
      doc.on("error", (err) => {
        reject(err);
      });

      const leftMargin = 50;
      const rightMargin = 545;

      // ====== HEADER SECTION ======
      doc
        .fillColor("#1f2937")
        .fontSize(20)
        .font("Helvetica-Bold")
        .text("SeatWorld", leftMargin, 50);

      doc.fillColor("#4b5563").fontSize(10).font("Helvetica");
      doc.text("INVOICE", leftMargin, 80);
      doc
        .fillColor("#1f2937")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(`#${order._id.toString().slice(-6).toUpperCase()}`, leftMargin, 95);

      doc
        .fillColor("#4b5563")
        .fontSize(10)
        .font("Helvetica")
        .text("DATE", rightMargin - 150, 80, { align: "right", width: 150 });

      doc
        .fillColor("#1f2937")
        .fontSize(11)
        .font("Helvetica-Bold")
        .text(
          new Date(order.createdAt).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          rightMargin - 150,
          95,
          { align: "right", width: 150 }
        );

      doc.moveDown(2);

      doc
        .moveTo(leftMargin, 120)
        .lineTo(rightMargin, 120)
        .lineWidth(1)
        .strokeColor("#e5e7eb")
        .stroke();

      doc.moveDown(1.5);

      // ====== ADDRESS & ORDER INFO ======
      const currentY = doc.y;
      const addr = order.shippingAddress;

      doc
        .fillColor("#4b5563")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("BILL TO:", leftMargin, currentY);

      doc.moveDown(0.3);
      doc.fillColor("#1f2937").fontSize(10).font("Helvetica-Bold").text(addr.name.toUpperCase());
      doc.font("Helvetica").text(`${addr.housename}, ${addr.street}`);
      doc.text(`${addr.city}, ${addr.state}`);
      doc.text(`${addr.pincode}, ${addr.country}`);
      doc.text(`Phone: ${addr.mobile}`);

      doc
        .fillColor("#4b5563")
        .fontSize(10)
        .font("Helvetica-Bold")
        .text("ORDER DETAILS:", rightMargin - 150, currentY, { width: 150, align: "right" });

      doc.moveDown(0.3);
      doc
        .fillColor("#1f2937")
        .fontSize(10)
        .font("Helvetica")
        .text(`Status: ${order.orderStatus || "Confirmed"}`, rightMargin - 150, doc.y, {
          width: 150,
          align: "right",
        });

      doc.text(`Payment: ${order.paymentMethod}`, rightMargin - 150, doc.y, {
        width: 150,
        align: "right",
      });

      doc.moveDown(3);

      // ====== PRODUCT TABLE ======
      const col1X = leftMargin;
      const col2X = 300;
      const col3X = 400;
      const col4X = 475;
      const colWidths = { p: 240, pr: 90, q: 60, t: 70 };

      doc.rect(leftMargin, doc.y - 5, rightMargin - leftMargin, 25).fill("#f9fafb");

      doc.fillColor("#4b5563").fontSize(10).font("Helvetica-Bold");
      doc.text("PRODUCT", col1X, doc.y);
      doc.text("PRICE", col2X, doc.y, { width: colWidths.pr, align: "right" });
      doc.text("QTY", col3X, doc.y, { width: colWidths.q, align: "right" });
      doc.text("TOTAL", col4X, doc.y, { width: colWidths.t, align: "right" });

      doc.moveDown(1);

      let calculatedSubtotal = 0;

      doc.font("Helvetica").fontSize(10).fillColor("#1f2937");

      for (const item of items) {
        const name = item.name || item.variantId?.productId?.name || "Product";
        const variant = item.variantLabel ? ` (${item.variantLabel})` : "";
        const price = Number(item.purchasedPrice || 0);
        const qty = Number(item.productQuantity || 1);
        const total = price * qty;
        calculatedSubtotal += total;

        doc.text(name + variant, col1X, doc.y, { width: colWidths.p });
        doc.text(`INR ${price.toFixed(2)}`, col2X, doc.y, { width: colWidths.pr, align: "right" });
        doc.text(qty.toString(), col3X, doc.y, { width: colWidths.q, align: "right" });
        doc.text(`INR ${total.toFixed(2)}`, col4X, doc.y, { width: colWidths.t, align: "right" });

        doc.moveDown(1);
      }

      // ====== FOOTER ======
      doc
        .fillColor("#9ca3af")
        .fontSize(8)
        .font("Helvetica")
        .text(
          "This is a computer-generated invoice and no signature is required.",
          leftMargin,
          780,
          { align: "center", width: rightMargin - leftMargin }
        );

      doc.text("Thank you for shopping with SeatWorld!", leftMargin, 792, {
        align: "center",
        width: rightMargin - leftMargin,
      });

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
