import bcrypt from "bcrypt";
import { User } from "../models/userModel.js";
import { Product, ProductVariant } from "../models/productModel.js";
// import { Category } from "../models/categoryModel.js";
// import Cart from "../models/cartModel.js";
import mongoose from "mongoose";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import validator from "validator";


// Landing Page 
export function getLanding(req, res) {
  if (req.isAuthenticated?.() || req.session?.user?.id) {
    return res.redirect("/dashboard");
  }
  res.render("users/landing");
}

// Login 
export function getLogin(req, res) {
  if (req.session.user) return res.redirect("/dashboard");
  res.render("users/login");
}

export async function postLogin(req, res) {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user.status == "blocked") {
      res.locals.message = { type: 'error', message: "This account has been blocked by admin" };
      return res.render("users/login");
    }
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = {
        id: user._id,
        name: user.username || user.name,
        email: user.email
      };
      return res.redirect("/dashboard");
    } else {
      res.locals.message = { type: 'error', message: "Invalid email or password" };
      return res.render("users/login");
    }
  } catch (err) {
    console.error(err);
    res.locals.message = { type: 'error', message: "Something went wrong" };
    return res.render("users/login");
  }
}

// ------------------ Signup ------------------
export function getSignup(req, res) {
  res.render("users/signup");
}
export async function postSignup(req, res) {
  const { username, email, password, confirmPassword, referralCode } = req.body;

  // Basic input validation
  if (!username || !email || !password || !confirmPassword) {
    res.locals.message = { type: 'error', message: "All fields are required" };
    return res.render("users/signup");
  }
  if (password !== confirmPassword) {
    res.locals.message = { type: 'error', message: "Passwords do not match" };
    return res.render("users/signup");
  }
  if (!validator.isEmail(email)) {
    res.locals.message = { type: 'error', message: "Invalid email address" };
    return res.render("users/signup");
  }
  if (password.length < 6) {
    res.locals.message = { type: 'error', message: "Password must be at least 6 characters" };
    return res.render("users/signup");
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.locals.message = { type: 'error', message: "Email already in use" };
      return res.render("users/signup");
    }

    const otp = otpGenerator.generate(4, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false,
    });
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store signup info in session for verification
    req.session.signupInfo = {
      username,
      email,
      password: hashedPassword,
      otp,
      otpExpires,
      referralCode: referralCode || null,
    };

    // Send OTP Email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL, pass: process.env.PASSWORD }
    });

    try {
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: email,
        subject: "Your OTP Code",
        text: `Your OTP is ${otp}. It will expire in 10 minutes.`,
      });
    } catch (mailError) {
      console.error("Email sending failed:", mailError.message);
      res.locals.message = { type: 'error', message: "Invalid email or OTP could not be sent" };
      return res.render("users/signup");
    }
    // Redirect to OTP verification page
    return res.redirect("/verify-otp");
  } catch (err) {
    console.error(err);
    res.locals.message = { type: 'error', message: "Something went wrong. Please try again." };
    return res.render("users/signup");
  }
}

export function getverifyOtp(req, res) {
  const signupInfo = req.session.signupInfo;
  res.render("users/otp", { otpExpires: signupInfo.otpExpires });
}

export async function verifyOtp(req, res) {
  const { otp1, otp2, otp3, otp4 } = req.body;
  const otp = [otp1, otp2, otp3, otp4].filter(Boolean).join("");
  try {
    const { signupInfo } = req.session;
    if (!signupInfo) return res.redirect("/signup");

    // Check OTP validity
    if (!otp || otp.length !== 4 || signupInfo.otp !== otp) {
      res.locals.message = { type: 'error', message: "Invalid OTP" };
      return res.render("users/otp", { otpExpires: signupInfo.otpExpires });
    }
    if (signupInfo.otpExpires < new Date()) {
      res.locals.message = { type: 'error', message: "OTP expired. Please resend." };
      return res.render("users/otp", { otpExpires: signupInfo.otpExpires });
    }

    // Save user only now
    const newUser = new User({
      username: signupInfo.username,
      email: signupInfo.email,
      password: signupInfo.password,
      referralCode: signupInfo.referralCode,
      isVerified: true,
      authType: "local"
    });
    await newUser.save();


    req.session.user = {
      id: newUser._id,
      email: newUser.email,
      name: newUser.username
    };

    req.session.save(err => {
      if (err) {
        return res.render("users/otp", { message: { type: 'error', message: "Something went wrong" } });
      }
      delete req.session.signupInfo;
      delete req.session.otp;
      delete req.session.otpExpires;
      res.redirect("/dashboard");
    });
  } catch (err) {
    console.error(err);
    res.render("users/otp", { message: { type: 'error', message: "Something went wrong" } });
  }
}

// Resend OTP 
// Resend OTP 
export async function resendOtp(req, res) {
  try {
    const { type } = req.query;

    // 1. Signup Flow
    if (type === "signup" || (req.session.signupInfo && !type)) {
      const otp = otpGenerator.generate(4, {
        digits: true,
        upperCaseAlphabets: false,
        lowerCaseAlphabets: false,
        specialChars: false
      });
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

      req.session.signupInfo.otp = otp;
      req.session.signupInfo.otpExpires = otpExpires;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL, pass: process.env.PASSWORD },
      });

      try {
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: req.session.signupInfo.email,
          subject: "Your OTP Code",
          text: `Your OTP is ${otp}. It will expire in 10 minutes.`
        });
      } catch (mailError) {
        console.error("Resend signup OTP mail failed:", mailError.message);
        res.locals.message = { type: 'error', message: "Unable to resend OTP. Try again later." };
        return res.render("users/otp", { otpExpires: req.session.signupInfo.otpExpires });
      }

      res.locals.message = { type: 'success', message: "New OTP sent to your email" };
      return res.render("users/otp", { otpExpires });
    }

    // Determine User for and Forgot/Email flows
    const userId = req.session.resetUserId || req.session.user?.id || req.session.userId;
    if (!userId) {
      return res.redirect("/signup");
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.redirect("/signup");
    }

    const otp = otpGenerator.generate(4, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    });
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // Standardize to 5 mins for security

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL, pass: process.env.PASSWORD },
    });

    // 2. Email Change Flow
    if (type === "email" || (user.tempEmail && type !== "forgot")) {
      user.emailChangeOtp = otp;
      user.emailChangeOtpExpiry = otpExpires;
      user.otpAttempts = 0;
      await user.save();

      try {
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: user.tempEmail,
          subject: "Your New OTP Code",
          text: `Your new Otp is ${otp}. It will expire in 5 minutes`
        });
      } catch (mailError) {
        console.error("Resend email change OTP mail failed:", mailError.message);
        res.locals.message = { type: 'error', message: "Unable to resend OTP. Try again later." };
        return res.render("users/otp3", { otpExpires: user.emailChangeOtpExpiry, user });
      }

      res.locals.message = { type: 'success', message: "New OTP sent to your email" };
      return res.render("users/otp3", { otpExpires, user });
    }

    // 3. Forgot Password Flow
    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    try {
      await transporter.sendMail({
        from: process.env.EMAIL_USER || process.env.EMAIL,
        to: user.email,
        subject: "Your Password Reset OTP",
        text: `Your OTP for password reset is ${otp}. It will expire in 5 minutes.`
      });
    } catch (mailError) {
      console.error("Resend forgot pass OTP mail failed:", mailError.message);
      res.locals.message = { type: 'error', message: "Unable to resend OTP. Try again later." };
      return res.render("users/otp2", { otpExpires: user.otpExpires });
    }

    res.locals.message = { type: 'success', message: "New OTP sent to your email" };
    return res.render("users/otp2", { otpExpires });

  } catch (err) {
    console.error(err);
    return res.render("users/otp", { message: { type: 'error', message: "Unable to resend OTP" } });
  }
}

// ------------------ Forgot Password ------------------
export function getforgotPass(req, res) {
  res.render("users/forgotpassword");
}

export async function postforgotPass(req, res) {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).render("users/forgotpassword", {
        message: { type: 'error', message: "No account found with this email" }
      });
    }

    if (user.authType === "google") {
      req.session.message = { type: 'warning', message: "Password reset is not available for Google login accounts" };
      return res.status(403).redirect("/login");
    }

    // ✅ If OTP is still valid, redirect to verification page
    if (user.otp && user.otpExpires && user.otpExpires > new Date()) {
      req.session.resetUserId = user._id || user.id;
      return req.session.save(() => {
        res.locals.message = { type: 'info', message: "OTP already sent. You can verify it below." };
        return res.render("users/otp2", {
          otpExpires: user.otpExpires
        });
      });
    }

    const otp = otpGenerator.generate(4, {
      digits: true,
      upperCaseAlphabets: false,
      lowerCaseAlphabets: false,
      specialChars: false
    });

    const expiry = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = String(otp);
    user.otpExpires = expiry;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
      }
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER || process.env.EMAIL,
      to: user.email,
      subject: "Your Password Reset OTP",
      text: `Your OTP for password reset is ${otp}. It will expire in 5 minutes.`
    });

    req.session.resetUserId = user._id || user.id;
    req.session.save(() => {
      res.locals.message = { type: 'success', message: "OTP sent to your email" };
      return res.status(201).render("users/otp2", {
        otpExpires: expiry
      });
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).render("users/forgotpassword", {
      message: { type: 'error', message: "Something went wrong. Please try again." }
    });
  }
}
export async function otpverifyForgot(req, res) {
  try {

    if (!req.session || !req.session.resetUserId) {
      return res.status(401).render("users/otp2", {
        message: { type: 'error', message: "Session expired. Please request OTP again." },
        otpExpires: null
      });
    }

    // 2️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.session.resetUserId)) {
      return res.status(401).render("users/otp2", {
        message: { type: 'error', message: "Invalid session. Please request OTP again." },
        otpExpires: null
      });
    }

    // 3️⃣ Fetch user
    const user = await User.findById(req.session.resetUserId);
    if (!user) {
      return res.status(404).render("users/otp2", {
        message: { type: 'error', message: "User not found." },
        otpExpires: null
      });
    }

    // 4️⃣ Read OTP
    const { otp1, otp2, otp3, otp4 } = req.body;
    const enteredOtp = `${otp1 || ""}${otp2 || ""}${otp3 || ""}${otp4 || ""}`.trim();

    if (enteredOtp.length !== 4) {
      return res.status(400).render("users/otp2", {
        message: { type: 'error', message: "Please enter the 4-digit OTP." },
        otpExpires: user.otpExpires
      });
    }

    // 5️⃣ Expiry check
    const now = Date.now();
    const expiresAt = new Date(user.otpExpires).getTime();

    if (!user.otp || expiresAt < now) {
      return res.status(400).render("users/otp2", {
        message: { type: 'error', message: "OTP expired. Please request a new one." },
        otpExpires: null
      });
    }

    // 6️⃣ OTP match check
    if (user.otp !== enteredOtp) {
      return res.status(400).render("users/otp2", {
        message: { type: 'error', message: "Invalid OTP. Please try again." },
        otpExpires: user.otpExpires
      });
    }

    // 7️⃣ SUCCESS → allow password reset
    req.session.allowPasswordReset = true;

    // Clear OTP from DB (important)
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // 8️⃣ Redirect to create password page
    res.redirect("/create-password");

  } catch (error) {
    console.error("OTP verification error:", error);
    res.status(500).render("users/otp2", {
      message: { type: 'error', message: "Something went wrong. Please try again." },
      otpExpires: null
    });
  }
}

export function getPassCreation(req, res) {
  res.render("users/createpass");
}
export async function postPassCreation(req, res) {
  try {
    const { newPassword, confirmPassword } = req.body;

    // Check if user is allowed to reset password
    if (!req.session.allowPasswordReset || !req.session.resetUserId) {
      return res.redirect("/forgot-password");
    }

    // Validate passwords
    if (!newPassword || !confirmPassword) {
      return res.render("users/createpass", { message: { type: 'error', message: "Please fill all fields." } });
    }

    if (newPassword !== confirmPassword) {
      return res.render("users/createpass", { message: { type: 'error', message: "Passwords do not match." } });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findById(req.session.resetUserId);
    if (!user) {
      return res.render("users/login", { message: { type: 'error', message: "User not found." } });
    }

    user.password = hashedPassword;
    await user.save();

    // Clear session flags
    delete req.session.allowPasswordReset;
    delete req.session.resetUserId;

    // Redirect to login with success message
    req.session.message = { type: 'success', message: "Password reset successful. Please login." };
    res.redirect("/login");

  } catch (error) {
    console.error("Error creating new password:", error);
    res.render("users/createpass", { message: { type: 'error', message: "Something went wrong. Please try again." } });
  }
}

//  Home & Logout
export async function getHome(req, res) {
  if (!req.session.user) return res.redirect("/login");

  const products = await Product.find({});
  const variants = await ProductVariant.find({ productId: products._id });
  try {
    const freshUser = await User.findById(req.session.user.id);
    if (!freshUser) {
      req.session.destroy();
      return res.redirect("/login");
    }

    res.render("users/home", { user: freshUser, image: variants.images, products });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}
export async function getCart(req, res) {
  try {
    const carts = await Cart.find({});
    res.render("users/cartlist", { cartItems: carts });
  }
  catch (err) {
    res.status(502).json({ "message": "cart page have internal issue" })
  }
}


export function getLogout(req, res) {
  req.session.destroy((err) => {
    if (err) console.log(err);
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
}
