import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import nocache from "nocache";
import dotenv from "dotenv";
import logger from "./utils/logger.js";

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// DB - Connect first or use existing URI
const mongoUri = process.env.MONGO_URI;
import connectDB from "./config/database.js";

import adminRouter from "./routes/adminRoutes.js";
import userRouter from "./routes/userRoutes.js";
import uploadRoutes from "./routes/upload.js";
import passport from "./config/googleAuth.js";
import AuthRoute from "./routes/gAuthRoute.js";
import profileRouter from "./routes/userProfileRoutes.js";
import adminProductRouter from "./routes/adminProductRoutes.js";
import adminCategoryRouter from "./routes/adminCategoryRoute.js";
import adminOrderRouter from "./routes/adminOrderRoutes.js";
import productRouter from "./routes/userProductRoute.js";
import cartRouter from "./routes/cartRoute.js";
import checkoutRouter from "./routes/checkoutRoute.js";
import orderRouter from "./routes/orderRoute.js";
import adminInventoryRouter from "./routes/adminInventoryRoutes.js";
import wishlistRouter from "./routes/wishlistRoute.js";
import adminCouponRouter from "./routes/adminCouponRoutes.js";
import adminOfferRouter from "./routes/adminOfferRoutes.js";
import razorpayRoute from "./routes/razorpayRoutes.js";
import salesRoute from "./routes/salesReportRoutes.js";




app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(nocache());
app.use(express.static("public"));

app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.url}`);
  res.locals.path = req.path;
  next();
});


app.use(session({
  secret: process.env.SESSION_SECRET || "default_secret",
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: mongoUri,
    collectionName: 'sessions'
  }),
  cookie: {
    secure: false, // set to true if using https
    maxAge: 1000 * 60 * 60 * 24 // 1 day
  }
}));


app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});


app.use(passport.initialize());
app.use(passport.session());

// View engine
app.set("view engine", "ejs");
app.set("views", "./views");

connectDB();

app.use(async (req, res, next) => {
  try {
    if (req.session && req.session.user && req.session.user.id) {
      const user = await User.findById(req.session.user.id);
      if (user && user.status === "blocked") {
        return req.session.destroy((err) => {
          if (err) logger.error("Session destruction error:", err);

          // Pass message via JSON cookie (since session is destroyed)
          res.cookie('blocked_msg', JSON.stringify({
            status: 'blocked',
            message: 'Your account has been blocked by admin.'
          }), { maxAge: 60000 }); // 1 minute expiry

          res.clearCookie("connect.sid");

          if (req.xhr || req.headers.accept?.includes("application/json")) {
            return res.status(403).json({ success: false, message: "Your account has been blocked." });
          }
          res.redirect("/login");
        });
      }
    }
    next();
  } catch (error) {
    logger.error("Blocked user check error:", error);
    next();
  }
});

// Routes
app.use("/api", uploadRoutes);
app.use("/auth", AuthRoute);
app.use("/", userRouter);
app.use("/admin", adminRouter);
app.use("/", profileRouter);
app.use("/", productRouter);
app.use("/admin", adminCategoryRouter);
app.use("/admin", adminProductRouter);
app.use("/cart", cartRouter);
app.use("/", checkoutRouter);
app.use("/admin/orders", adminOrderRouter);
app.use("/admin/inventory", adminInventoryRouter);
app.use("/admin/coupons", adminCouponRouter);
app.use("/admin/offers", adminOfferRouter);
app.use("/", orderRouter);
app.use("/wishlist", wishlistRouter);
app.use("/razorpay", razorpayRoute);
app.use("/admin/sales-report", salesRoute);


app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

// 404 Handler
app.use((req, res) => {
  if (req.headers.accept?.includes("application/json")) {
    return res.status(404).json({
      success: false,
      message: "Route not found"
    });
  }
  res.status(404).render("404");
});

app.use((err, req, res, next) => {
  logger.error(err);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Something went wrong. Please try again later.";

  if (req.xhr || req.headers.accept?.includes("application/json")) {
    return res.status(statusCode).json({
      success: false,
      message
    });
  }

  const homeLink = req.originalUrl.startsWith('/admin') ? '/admin/dashboard' : '/';

  res.status(statusCode).render("500", {
    message: "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err : {},
    homeLink
  });
});
import "./cron/couponExpiry.job.js";
import { User } from "./models/userModel.js";


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${process.env.LOCALURL}`);
});

