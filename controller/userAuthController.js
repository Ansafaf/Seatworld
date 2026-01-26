import bcrypt from "bcrypt";
import { User } from "../models/userModel.js";
import { Product, ProductVariant } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
import Cart from "../models/cartModel.js";
import wishlistModel from "../models/wishlistModel.js";
import mongoose from "mongoose";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import validator from "validator";
import { buildBreadcrumb } from "../utils/breadcrumb.js";
import Wallet from "../models/walletModel.js";
import { loggers } from "winston";
import { createReferralForUser } from "../services/referralService.js";
import { generateReferralCode } from "../utils/generateReferral.js";
import { status_Codes } from "../enums/statusCodes.js";


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

  // Read message from JSON cookie if present
  let blockedMessage = null;
  const cookieHeader = req.headers.cookie;
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=');
      acc[key] = value;
      return acc;
    }, {});

    if (cookies.blocked_msg) {
      try {
        blockedMessage = JSON.parse(decodeURIComponent(cookies.blocked_msg));
        res.clearCookie('blocked_msg');
      } catch (e) {
        console.error("Error parsing blocked_msg cookie:", e);
      }
    }
  }

  res.render("users/login", { blockedMessage });
}

export async function postLogin(req, res) {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(status_Codes.UNAUTHORIZED).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    if (user.authType === "google") {
      return res.status(status_Codes.FORBIDDEN).json({
        success: false,
        message: "This email is linked to a Google account. Please use Google Login."
      });
    }

    if (user.status == "blocked") {
      return res.status(status_Codes.FORBIDDEN).json({
        success: false,
        message: "This account has been blocked by admin"
      });
    }

    if (await bcrypt.compare(password, user.password)) {
      req.session.user = {
        id: user._id,
        name: user.username || user.name,
        email: user.email,
        avatar: user.avatar
      };
      return res.status(status_Codes.OK).json({
        success: true,
        message: "Login successful",
        redirectUrl: "/home"
      });
    } else {
      return res.status(status_Codes.UNAUTHORIZED).json({
        success: false,
        message: "Invalid email or password"
      });
    }
  } catch (err) {
    console.error(err);
    return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
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
  let { username, email, password, confirmPassword, referralCode } = req.body;

  username = username?.trim();
  email = email?.trim();
  password = password?.trim();
  confirmPassword = confirmPassword?.trim();
  referralCode = referralCode?.trim();

  if (!username || !email || !password || !confirmPassword) {
    return res.status(status_Codes.BAD_REQUEST).json({
      success: false,
      message: "All fields are required and cannot be empty"
    });
  }

  // Username validation
  const usernameRegex = /^[a-zA-Z0-9_ ]{3,20}$/;
  if (!usernameRegex.test(username)) {
    return res.status(status_Codes.BAD_REQUEST).json({
      success: false,
      message: "Username must be 3-20 characters and contain only letters, numbers, and underscores"
    });
  }
  if (password !== confirmPassword) {
    return res.status(status_Codes.BAD_REQUEST).json({
      success: false,
      message: "Passwords do not match"
    });
  }
  if (!validator.isEmail(email)) {
    return res.status(status_Codes.BAD_REQUEST).json({
      success: false,
      message: "Invalid email address"
    });
  }
  if (password.length < 6) {
    return res.status(status_Codes.BAD_REQUEST).json({
      success: false,
      message: "Password must be at least 6 characters"
    });
  }

  if (referralCode) {
    let refferer = await User.findOne({ referralCode });
    if (!refferer) {
      return res.status(status_Codes.BAD_REQUEST).json({ message: "Invalid referral code" });
    }

  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.authType === "google") {
        return res.status(status_Codes.CONFLICT).json({
          success: false,
          message: "This email is linked to a Google account. Please use Google Login."
        });
      }
      return res.status(status_Codes.CONFLICT).json({
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
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    const resendExpires = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes
    const hashedPassword = await bcrypt.hash(password, 10);

    // Store signup info in session for verification
    req.session.signupInfo = {
      username,
      email,
      password: hashedPassword,
      otp,
      otpExpires,
      resendExpires,
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
        text: `Your OTP is ${otp}. It will expire in 5 minutes.`,
      });
    } catch (mailError) {
      console.error("Email sending failed:", mailError.message);
      return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Invalid email or OTP could not be sent"
      });
    }
    // Redirect to OTP verification page
    return res.status(status_Codes.OK).json({
      success: true,
      message: "OTP sent to your email",
      redirectUrl: "/verify-otp"
    });
  } catch (err) {
    console.error(err);
    return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong. Please try again."
    });
  }
}

export function getverifyOtp(req, res) {
  const signupInfo = req.session.signupInfo;
  res.render("users/otp", {
    otpExpires: signupInfo.otpExpires,
    resendExpires: signupInfo.resendExpires,
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
      return res.status(status_Codes.BAD_REQUEST).json({
        success: false,
        message: "Session expired. Please signup again.",
        redirectUrl: "/signup"
      });
    }

    // Check OTP validity
    if (!otp || otp.length !== 4 || signupInfo.otp !== otp) {
      return res.status(status_Codes.BAD_REQUEST).json({
        success: false,
        message: "Invalid OTP"
      });
    }
    if (signupInfo.otpExpires < new Date()) {
      return res.status(status_Codes.BAD_REQUEST).json({
        success: false,
        message: "OTP expired. Please resend."
      });
    }
    let referrer = null;
    if (signupInfo.referralCode) {
      referrer = await User.findOne({ referralCode: signupInfo.referralCode });
    }

    // Save user only now
    const newUser = new User({
      username: signupInfo.username,
      email: signupInfo.email,
      password: signupInfo.password,
      referralCode: generateReferralCode(signupInfo.username),
      refferedBy: referrer ? referrer._id : null,
      isVerified: true,
      authType: "local"
    });

    await newUser.save();

    const newWallet = new Wallet({
      userId: newUser._id,
      balance: 0,
      transactions: []
    });

    if (referrer) {
      // Credit Referrer
      let walletReferrer = await Wallet.findOne({ userId: referrer._id });
      if (walletReferrer) {
        walletReferrer.balance += 100;
        walletReferrer.transactions.push({
          walletTransactionId: otpGenerator.generate(12, { specialChars: false }),
          amount: 100,
          type: 'credit',
          description: 'Referral Bonus'
        });
        await walletReferrer.save();
      }

      // Credit New User
      newWallet.balance = 50;
      newWallet.transactions.push({
        walletTransactionId: otpGenerator.generate(12, { specialChars: false }),
        amount: 50,
        type: 'credit',
        description: 'Referral Bonus'
      });
    }

    await newWallet.save();


    req.session.user = {
      id: newUser._id,
      email: newUser.email,
      name: newUser.username,
      avatar: newUser.avatar
    };

    req.session.save(err => {
      if (err) {
        return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Something went wrong saving session"
        });
      }
      delete req.session.signupInfo;
      delete req.session.otp;
      delete req.session.otpExpires;
      return res.status(status_Codes.OK).json({
        success: true,
        message: "Verification successful",
        redirectUrl: "/home"
      });
    });
  } catch (err) {
    console.error(err);
    return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong"
    });
  }
}

export const getReferralCode = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const referralCode = await createReferralForUser(userId);

    return res.status(status_Codes.OK).json({ success: true, referralCode });
  }
  catch (err) {
    return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: err.message });
  }
}

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
      const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
      const resendExpires = new Date(Date.now() + 2 * 60 * 1000);

      req.session.signupInfo.otp = otp;
      req.session.signupInfo.otpExpires = otpExpires;
      req.session.signupInfo.resendExpires = resendExpires;

      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: { user: process.env.EMAIL, pass: process.env.PASSWORD },
      });

      try {
        await transporter.sendMail({
          from: process.env.EMAIL,
          to: req.session.signupInfo.email,
          subject: "Your OTP Code",
          text: `Your OTP is ${otp}. It will expire in 5 minutes.`
        });
      } catch (mailError) {
        console.error("Resend signup OTP mail failed:", mailError.message);
        return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Unable to resend OTP. Try again later."
        });
      }

      return res.status(status_Codes.OK).json({
        success: true,
        message: "New OTP sent to your email",
        otpExpires,
        resendExpires
      });
    }

    // Determine User for and Forgot/Email flows
    const userId = req.session.resetUserId || req.session.user?.id || req.session.userId;
    if (!userId) {
      return res.status(status_Codes.UNAUTHORIZED).json({
        success: false,
        message: "Session expired",
        redirectUrl: "/signup"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(status_Codes.NOT_FOUND).json({
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
      const resendExpires = new Date(Date.now() + 2 * 60 * 1000);
      user.emailChangeOtp = otp;
      user.emailChangeOtpExpiry = otpExpires;
      user.resendExpires = resendExpires; // Assuming User model has this or can store it
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
        return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
          success: false,
          message: "Unable to resend OTP. Try again later."
        });
      }

      return res.status(status_Codes.OK).json({
        success: true,
        message: "New OTP sent to your email",
        otpExpires,
        resendExpires
      });
    }

    // 3. Forgot Password Flow
    const resendExpires = new Date(Date.now() + 2 * 60 * 1000);
    user.otp = otp;
    user.otpExpires = otpExpires;
    user.resendExpires = resendExpires;
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
      return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: "Unable to resend OTP. Try again later."
      });
    }

    return res.status(status_Codes.OK).json({
      success: true,
      message: "New OTP sent to your email",
      otpExpires,
      resendExpires
    });

  } catch (err) {
    console.error(err);
    return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong"
    });
  }
}

// ------------------ Forgot Password ------------------
export function getforgotPass(req, res) {
  res.render("users/forgotpassword", {
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
      return res.status(status_Codes.NOT_FOUND).json({
        success: false,
        message: "No account found with this email"
      });
    }

    if (user.authType === "google") {
      return res.status(status_Codes.UNAUTHORIZED).json({
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

    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
    const resendExpires = new Date(Date.now() + 2 * 60 * 1000);

    user.otp = String(otp);
    user.otpExpires = otpExpires;
    user.resendExpires = resendExpires;
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
      return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
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
    return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Something went wrong. Please try again."
    });
  }
}
export async function otpverifyForgot(req, res) {
  try {

    if (!req.session || !req.session.resetUserId) {
      return res.status(status_Codes.UNAUTHORIZED).json({
        success: false,
        message: "Session expired. Please request OTP again.",
        redirectUrl: "/forgot-password"
      });
    }

    //  Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(req.session.resetUserId)) {
      return res.status(status_Codes.UNAUTHORIZED).json({
        success: false,
        message: "Invalid session. Please request OTP again.",
        redirectUrl: "/forgot-password"
      });
    }


    const user = await User.findById(req.session.resetUserId);
    if (!user) {
      return res.status(status_Codes.NOT_FOUND).json({
        success: false,
        message: "User not found."
      });
    }

    const { otp1, otp2, otp3, otp4 } = req.body;
    const enteredOtp = `${otp1 || ""}${otp2 || ""}${otp3 || ""}${otp4 || ""}`.trim();

    if (enteredOtp.length !== 4) {
      return res.status(status_Codes.BAD_REQUEST).json({
        success: false,
        message: "Please enter the 4-digit OTP."
      });
    }

    const now = Date.now();
    const expiresAt = new Date(user.otpExpires).getTime();

    if (!user.otp || expiresAt < now) {
      return res.status(status_Codes.BAD_REQUEST).json({
        success: false,
        message: "OTP expired. Please request a new one."
      });
    }

    if (user.otp !== enteredOtp) {
      return res.status(status_Codes.BAD_REQUEST).json({
        success: false,
        message: "Invalid OTP. Please try again."
      });
    }

    req.session.allowPasswordReset = true;

    user.otp = null;
    user.otpExpires = null;
    await user.save();

    return res.status(status_Codes.OK).json({
      success: true,
      message: "OTP verified successfully",
      redirectUrl: "/create-password"
    });

  } catch (error) {
    console.error("OTP verification error:", error);
    return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
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
      return res.status(status_Codes.UNAUTHORIZED).json({
        success: false,
        message: "Session expired or unauthorized. Please request OTP again.",
        redirectUrl: "/forgot-password"
      });
    }

    // Validate passwords
    if (!newPassword || !confirmPassword) {
      return res.status(status_Codes.BAD_REQUEST).json({
        success: false,
        message: "Please fill all fields."
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(status_Codes.BAD_REQUEST).json({
        success: false,
        message: "Passwords do not match."
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    const user = await User.findById(req.session.resetUserId);
    if (!user) {
      return res.status(status_Codes.NOT_FOUND).json({
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
    return res.status(status_Codes.OK).json({
      success: true,
      message: "Password reset successful. Please login.",
      redirectUrl: "/login"
    });

  } catch (error) {
    console.error("Error creating new password:", error);
    return res.status(status_Codes.INTERNAL_SERVER_ERROR).json({
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
    resendExpires: user.resendExpires,
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
    res.status(status_Codes.INTERNAL_SERVER_ERROR).send("Internal Server Error");
  }
}


export async function getUserCounts(req, res) {
  try {
    const userId = req.session.user?.id || req.user?.id || req.user?._id;
    if (!userId) {
      return res.json({ cartCount: 0, wishlistCount: 0 });
    }

    const [cartCount, wishlistCount] = await Promise.all([
      Cart.countDocuments({ userId }),
      wishlistModel.countDocuments({ userId })
    ]);

    res.json({ cartCount, wishlistCount });
  } catch (error) {
    console.error("Error fetching user counts:", error);
    res.status(status_Codes.INTERNAL_SERVER_ERROR).json({ success: false, message: "Internal server error" });
  }
}


export function getLogout(req, res) {
  req.session.destroy((err) => {
    res.clearCookie("connect.sid");
    res.redirect("/login");
  });
}