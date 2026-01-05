import bcrypt from "bcrypt";
import { User } from "../models/userModel.js";
import { Product, ProductVariant } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
import Cart from "../models/cartModel.js";
import mongoose from "mongoose";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import validator from "validator";
import { buildBreadcrumb } from "../utils/breadcrumb.js";


// Landing Page 
export function getLanding(req, res) {
  if (req.isAuthenticated?.() || req.session?.user?.id) {
    return res.redirect("/home");
  }
  res.render("users/landing");
}

// Login 
export function getLogin(req, res) {
  if (req.session.user) return res.redirect("/home");
  res.render("users/login");
}

export async function postLogin(req, res) {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (user.status == "blocked") {
      return res.status(403).json({
        success: false,
        message: "This account has been blocked by admin"
      });
    }

    if (await bcrypt.compare(password, user.password)) {
      req.session.user = {
        id: user._id,
        name: user.username || user.name,
        email: user.email
      };
      return res.status(200).json({
        success: true,
        message: "Login successful",
        redirectUrl: "/home"
      });
    } else {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
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
    return res.status(400).json({
      success: false,
      message: "All fields are required"
    });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({
      success: false,
      message: "Passwords do not match"
    });
  }
  if (!validator.isEmail(email)) {
    return res.status(400).json({
      success: false,
      message: "Invalid email address"
    });
  }
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 6 characters"
    });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "Email already in use"
      });
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
      return res.status(500).json({
        success: false,
        message: "Invalid email or OTP could not be sent"
      });
    }
    // Redirect to OTP verification page
    return res.status(200).json({
      success: true,
      message: "OTP sent to your email",
      redirectUrl: "/verify-otp"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again."
    });
  }
}

export function getverifyOtp(req, res) {
  const signupInfo = req.session.signupInfo;
  res.render("users/otp", {
    otpExpires: signupInfo.otpExpires,
    breadcrumbs: buildBreadcrumb([
      { label: "Signup", url: "/signup" },
      { label: "Verify OTP", url: "/verify-otp" }
    ])
  });
}

export async function verifyOtp(req, res) {
  const { otp1, otp2, otp3, otp4 } = req.body;
  const otp = [otp1, otp2, otp3, otp4].filter(Boolean).join("");
  try {
    const { signupInfo } = req.session;
    if (!signupInfo) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please signup again.",
        redirectUrl: "/signup"
      });
    }

    // Check OTP validity
    if (!otp || otp.length !== 4 || signupInfo.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }
    if (signupInfo.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please resend."
      });
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
        return res.status(500).json({
          success: false,
          message: "Something went wrong saving session"
        });
      }
      delete req.session.signupInfo;
      delete req.session.otp;
      delete req.session.otpExpires;
      return res.status(200).json({
        success: true,
        message: "Verification successful",
        redirectUrl: "/home"
      });
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
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
        return res.status(500).json({
          success: false,
          message: "Unable to resend OTP. Try again later."
        });
      }

      return res.status(200).json({
        success: true,
        message: "New OTP sent to your email",
        otpExpires
      });
    }

    // Determine User for and Forgot/Email flows
    const userId = req.session.resetUserId || req.session.user?.id || req.session.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Session expired",
        redirectUrl: "/signup"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        redirectUrl: "/signup"
      });
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
        return res.status(500).json({
          success: false,
          message: "Unable to resend OTP. Try again later."
        });
      }

      return res.status(200).json({
        success: true,
        message: "New OTP sent to your email",
        otpExpires
      });
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
      return res.status(500).json({
        success: false,
        message: "Unable to resend OTP. Try again later."
      });
    }

    return res.status(200).json({
      success: true,
      message: "New OTP sent to your email",
      otpExpires
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
}

// ------------------ Forgot Password ------------------
export function getforgotPass(req, res) {
  res.render("users/forgotPassword", {
    breadcrumbs: buildBreadcrumb([
      { label: "Forgot Password", url: "/forgot-password" }
    ])
  });
}

export async function postforgotPass(req, res) {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email"
      });
    }

    if (user.authType === "google") {
      return res.status(403).json({
        success: false,
        message: "Password reset is not available for Google login accounts"
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

    try {
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: user.email,
        subject: "Your Password Reset OTP",
        text: `Your OTP for password reset is ${otp}. It will expire in 5 minutes.`
      });
    } catch (mailError) {
      console.error("Email sending failed:", mailError.message);
      return res.status(500).json({
        success: false,
        message: "Unable to send OTP. Please try again later."
      });
    }

    req.session.resetUserId = user._id || user.id;
    req.session.save(() => {
      return res.status(200).json({
        success: true,
        message: "OTP sent to your email",
        redirectUrl: "/forgot-password/verify"
      });
    });

  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again."
    });
  }
}
export async function otpverifyForgot(req, res) {
  try {

    if (!req.session || !req.session.resetUserId) {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please request OTP again.",
        redirectUrl: "/forgot-password"
      });
    }

    // 2️⃣ Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.session.resetUserId)) {
      return res.status(401).json({
        success: false,
        message: "Invalid session. Please request OTP again.",
        redirectUrl: "/forgot-password"
      });
    }

    // 3️⃣ Fetch user
    const user = await User.findById(req.session.resetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    // 4️⃣ Read OTP
    const { otp1, otp2, otp3, otp4 } = req.body;
    const enteredOtp = `${otp1 || ""}${otp2 || ""}${otp3 || ""}${otp4 || ""}`.trim();

    if (enteredOtp.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Please enter the 4-digit OTP."
      });
    }

    // 5️⃣ Expiry check
    const now = Date.now();
    const expiresAt = new Date(user.otpExpires).getTime();

    if (!user.otp || expiresAt < now) {
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one."
      });
    }

    // 6️⃣ OTP match check
    if (user.otp !== enteredOtp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again."
      });
    }

    // 7️⃣ SUCCESS → allow password reset
    req.session.allowPasswordReset = true;

    // Clear OTP from DB (important)
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    // 8️⃣ Success response
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      redirectUrl: "/create-password"
    });

  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again."
    });
  }
}

export function getPassCreation(req, res) {
  res.render("users/createPass", {
    breadcrumbs: buildBreadcrumb([
      { label: "Forgot Password", url: "/forgot-password" },
      { label: "Create New Password", url: "/create-password" }
    ])
  });
}
export async function postPassCreation(req, res) {
  try {
    const { newPassword, confirmPassword } = req.body;

    // Check if user is allowed to reset password
    if (!req.session.allowPasswordReset || !req.session.resetUserId) {
      return res.status(403).json({
        success: false,
        message: "Session expired or unauthorized. Please request OTP again.",
        redirectUrl: "/forgot-password"
      });
    }

    // Validate passwords
    if (!newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Please fill all fields."
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match."
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findById(req.session.resetUserId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found."
      });
    }

    user.password = hashedPassword;
    await user.save();

    // Clear session flags
    delete req.session.allowPasswordReset;
    delete req.session.resetUserId;

    // Success response
    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please login.",
      redirectUrl: "/login"
    });

  } catch (error) {
    console.error("Error creating new password:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again."
    });
  }
}


export async function getotpForgot(req, res) {
  if (!req.session.resetUserId) {
    return res.redirect("/forgot-password");
  }
  const user = await User.findById(req.session.resetUserId);
  res.render("users/otp2", {
    otpExpires: user.otpExpires,
    breadcrumbs: buildBreadcrumb([
      { label: "Forgot Password", url: "/forgot-password" },
      { label: "Verify OTP", url: "/forgot-password/verify" }
    ])
  });
}

//  Home & Logout
export async function getHome(req, res) {
  if (!req.session.user) return res.redirect("/login");

  try {
    const products = await Product.find({ isBlocked: false }).limit(8);
    const categories = await Category.find({ isActive: true }).limit(3);
    const productIds = products.map(p => p._id);
    const variants = await ProductVariant.find({ productId: { $in: productIds } });

    const freshUser = await User.findById(req.session.user.id);
    if (!freshUser) {
      req.session.destroy();
      return res.redirect("/login");
    }

    res.render("users/home", {
      user: freshUser,
      variants,
      products,
      categories
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal Server Error");
  }
}


export function getLogout(req, res) {
  req.session.destroy((err) => {
    if (err) console.log(err);
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
}
