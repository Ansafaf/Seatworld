import PDFDocument from "pdfkit";

export default function generateInvoicePDF(order, items) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      resolve(Buffer.concat(buffers));
    });

    // 🧾 Header
    doc.fontSize(18).text("INVOICE", { align: "center" });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Order ID: ${order._id}`);
    doc.text(`Date: ${order.createdAt.toDateString()}`);
    doc.text(`Payment Method: ${order.paymentMethod}`);
    doc.moveDown();

    // 🚚 Address
    const addr = order.shippingAddress;
    doc.text("Shipping Address:");
    doc.text(
      `${addr.name},
${addr.housename},
${addr.street},
${addr.city}, ${addr.state},
${addr.pincode}, ${addr.country}
Mobile: ${addr.mobile}`
    );
    doc.moveDown();

    // 📦 Items
    doc.text("Items:");
    doc.moveDown(0.5);

    items.forEach((item, index) => {
      const itemName = item.name || item.variantId?.productId?.name || "Product";
      doc.text(
        `${index + 1}. ${itemName} | Qty: ${item.productQuantity}  Price: ₹${item.purchasedPrice}`
      );
    });

    doc.moveDown();
    doc.fontSize(14).text(`Total Amount: ₹${order.totalAmount}`, {
      align: "right"
    });

    doc.end();
  });
}