import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import nocache from "nocache";
import mongoose from "mongoose";
import dotenv from "dotenv";

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
import adminProductRouter from "./routes/AdminproductRoutes.js";
import adminCategoryRouter from "./routes/adminCategoryRoute.js";
import productRouter from "./routes/userProductRoute.js";

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(nocache());
app.use(express.static("public"));

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

app.use((req, res, next) => {
  // Transfer message from session to res.locals for EJS templates
  if (req.session.message) {
    const msg = req.session.message;
    res.locals.messageData = msg; // Full object for partial
    res.locals.message = typeof msg === 'string' ? msg : msg.message; // String for <%= message %>
    delete req.session.message;
  } else {
    res.locals.messageData = null;
    res.locals.message = null;
  }
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

app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});

// 404 Handler
app.use((req, res, next) => {
  res.status(404).render("404");
});

app.use((err, req, res, next) => {
  console.error("Global Error:", err.stack);

  const statusCode = err.statusCode || 500;
  const message =
    err.message || "Something went wrong. Please try again later.";
  // For API requests
  if (req.xhr || req.headers.accept?.includes("application/json")) {
    return res.status(statusCode).json({
      success: false,
      message
    });
  }

  // For EJS / page requests
  // res.status(statusCode).render("error/500", {
  //   message
  // });
});



app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

