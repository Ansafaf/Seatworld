import express from "express";
import session from "express-session";
import nocache from "nocache";
import mongoose from "mongoose";
import dotenv from "dotenv";
import adminRouter from "./routes/adminRoutes.js";
import adminProductRouter from "./routes/AdminproductRoutes.js";
import adminCategoryRouter from "./routes/adminCategoryRoute.js";
import userRouter from "./routes/userRoutes.js";
import uploadRoutes from "./routes/upload.js";
import passport from "./config/googleAuth.js";
import AuthRoute from "./routes/gAuthRoute.js";

dotenv.config();
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(nocache());

//Global session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || "default_secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false } 
}));

//  Passport
app.use(passport.initialize());
app.use(passport.session());

// View engine
app.set("view engine", "ejs");
app.set("views", "./views");

// DB
mongoose.connect("mongodb://127.0.0.1:27017/seatworld")
  .then(() => console.log("MongoDB connected"))
  .catch((error) => console.log(error));

// Routes
app.use("/api", uploadRoutes);
app.use("/auth", AuthRoute);
app.use("/", userRouter);
app.use("/admin", adminRouter);
app.use("/admin", adminProductRouter);
app.use("/admin", adminCategoryRouter);
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
  next();
});


app.listen(5000,'0.0.0.0',  () => {
  console.log("Server running on http://localhost:5000");
});

