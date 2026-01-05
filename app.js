import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import nocache from "nocache";
import mongoose from "mongoose";
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

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(nocache());
app.use(express.static("public"));

app.use((req, res, next) => {
  logger.info(`[${req.method}] ${req.url}`);
  res.locals.path = req.path;
  next();
});

//Global session middleware
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

// Flash message middleware
app.use((req, res, next) => {
  res.locals.message = req.session.message;
  delete req.session.message;
  next();
});


//  Passport
app.use(passport.initialize());
app.use(passport.session());

// View engine
app.set("view engine", "ejs");
app.set("views", "./views");

// DB
connectDB();

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

  res.status(statusCode).render("500", {
    message: "Internal Server Error",
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});


app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on ${process.env.LOCALURL}${PORT}`);
});

