import * as orderService from "../services/orderService.js";
import * as cartService from "../services/cartService.js";
import * as inventoryService from "../services/inventoryService.js";
import logger from "../utils/logger.js";
import Order from "../models/orderModel.js";
import OrderItem from "../models/orderItemModel.js";
import Wallet from "../models/walletModel.js";
import generateInvoicePDF from "../utils/invoiceGenerator.js";

export const getorders = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search || "";
    const { orders, pagination } = await orderService.getUserOrders(userId, page, 8, search);

    res.render("users/orderList", {
      orders,
      user: req.user,
      breadcrumbs: [{ label: "Home", url: "/" }, { label: "My Orders", url: "/orders" }],
      pagination,
      search,
      limit: 8
    });
  } catch (error) {
    console.error("Get Orders Controller Error:", error);
    logger.error("Get Orders Error:", error);
    res.status(500).render("500", { error: error.message });
  }
}

export const placeOrder = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { paymentMethod } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({ success: false, message: "Payment method is required" });
    }

    if (!req.session.checkout || !req.session.checkout.address) {
      logger.error("Session missing checkout or address");
      return res.status(400).json({ success: false, message: "Session expired or address missing" });
    }

    const cartTotals = await cartService.calculateCartTotals(userId);
    if (!cartTotals.items || cartTotals.items.length === 0) {
      logger.error("Cart is empty");
      return res.status(400).json({ success: false, message: "Cart is empty" });
    }

    const stockCheck = await inventoryService.checkStockAvailability(cartTotals.items);
    if (!stockCheck.available) {
      return res.status(400).json({
        success: false,
        message: `Insufficient stock for ${stockCheck.item}. Only ${stockCheck.availableStock} left.`
      });
    }

    let newOrder;
    if (paymentMethod === "COD" || paymentMethod === "Razorpay" || paymentMethod === "Wallet") {

      // Balance check for Wallet
      if (paymentMethod === "Wallet") {
        const wallet = await Wallet.findOne({ userId });
        if (!wallet || wallet.balance < cartTotals.total) {
          return res.status(400).json({
            success: false,
            message: "Insufficient wallet balance. Please add money to your wallet or choose another payment method."
          });
        }
      }

      newOrder = await orderService.createOrder({
        userId,
        paymentMethod,
        checkoutSession: req.session.checkout,
        cartTotals,
        paymentStatus: (paymentMethod === "Razorpay" || paymentMethod === "Wallet") ? "paid" : "pending"
      });
    } else {
      return res.status(400).json({
        success: false,
        message: `${paymentMethod} payment method is not supported yet.`
      });
    }

    req.session.checkout = null;
    const redirectUrl = `/order-success?orderId=${newOrder._id}`;

    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(200).json({
        success: true,
        orderId: newOrder._id,
        redirectUrl
      });
    }

    res.redirect(redirectUrl);

  } catch (error) {
    logger.error("Place Order Error:", error);
    if (req.xhr || req.headers.accept?.includes("json")) {
      return res.status(500).json({ success: false, message: "Failed to place order" });
    }
    res.redirect("/checkout/payment-options");
  }
};

export const getOrderSuccess = async (req, res) => {
  try {
    const orderId = req.query.orderId;
    const userId = req.session.user.id;
    const order = await orderService.getOrderById(orderId, userId);

    if (!order) {
      return res.redirect("/checkout");
    }
    res.render("users/orderSuccess", { order });
  } catch (err) {
    logger.error("Get Order Success Page Error:", err);
    res.status(500).render("500");
  }
}

export const getOrderFailed = async (req, res) => {
  try {
    const { orderId, message } = req.query;
    res.render("users/orderFailed", {
      orderId: orderId || null,
      message: message || "Oops! Something went wrong with your payment. Please try again."
    });
  } catch (err) {
    logger.error("Get Order Failed Page Error:", err);
    res.status(500).render("500");
  }
}

export const getOrderDetails = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.user.id;
    const order = await orderService.getOrderById(orderId, userId);

    if (!order) {
      return res.status(404).render("500", { message: "Order not found" });
    }

    const shortOrderId = orderId.toString().slice(-6).toUpperCase();
    const breadcrumbs = [
      { label: "Home", url: "/" },
      { label: "My Orders", url: "/orders" },
      { label: `Order #${shortOrderId}`, url: `/orders/${orderId}` }
    ];

    res.render("users/orderDetails", {
      order,
      user: req.user,
      breadcrumbs
    });
  } catch (error) {
    logger.error("Get Order Details Error:", error);
    res.status(500).render("500");
  }
};

export const handleItemAction = async (req, res) => {
  try {
    const { orderId, itemId } = req.params;
    const { action, returnReason, returnComment } = req.body;
    const userId = req.session.user.id;

    const { order, item } = await orderService.handleItemAction({
      orderId,
      userId,
      itemId,
      action,
      returnReason,
      returnComment
    });

    res.status(200).json({
      success: true,
      message: `${action === 'cancel' ? 'Item cancelled successfully' : 'Return request submitted successfully'}`,
      orderStatus: order.orderStatus,
      itemStatus: item.status
    });
  } catch (error) {
    logger.error("Handle Item Action Error:", error);
    res.status(400).json({
      success: false,
      message: error.message || "Failed to process item action"
    });
  }
};




export const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.user.id;

    const orderData = await orderService.getOrderById(orderId, userId);
    if (!orderData) {
      return res.status(404).send("Invoice not found");
    }

    const pdfBuffer = await generateInvoicePDF(orderData, orderData.items);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=invoice-${orderId}.pdf`
    );

    res.send(pdfBuffer);
  } catch (err) {
    console.error("Invoice download error:", err);
    res.status(500).send("Failed to generate invoice");
  }
};