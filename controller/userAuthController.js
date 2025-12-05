import bcrypt from "bcrypt";
import { User } from "../models/userModel.js";
import { Product, ProductVariant } from "../models/productModel.js";
import { Category } from "../models/categoryModel.js";
import Cart from "../models/cartModel.js";
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
  res.render("users/login", {
    message: req.query.msg || null,
    error: null
  });
}

export async function postLogin(req, res) {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if(user.isBlocked == true){
      return res.render("users/login",{error:"This account has been blocked by admin"});
    }
    if (user && await bcrypt.compare(password, user.password)) {
      req.session.user = {
        id: user._id,
        name: user.username || user.name,
        email: user.email
      };
      return res.redirect("/dashboard");
    } else {
      return res.render("users/login", { error: "Invalid email or password" });
    }
  } catch (err) {
    console.error(err);
    return res.render("users/login", { error: "Something went wrong" });
  }
}

// ------------------ Signup ------------------
export function getSignup(req, res) {
  res.render("users/signup");
}
export async function postSignup(req, res) {
  const { username, email, password } = req.body;

  // Basic input validation
  if (!username || !email || !password) {
    return res.render("users/signup", { error: "All fields are required" });
  }
  if (!validator.isEmail(email)) {
    return res.render("users/signup", { error: "Invalid email address" });
  }
  if (password.length < 6) {
    return res.render("users/signup", { error: "Password must be at least 6 characters" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.render("users/signup", { error: "Email already in use" });
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
    };

    // Send OTP Email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL, pass: process.env.PASSWORD },
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
      return res.render("users/signup", {
        error: "Invalid email or OTP could not be sent",
      });
    }
    // Redirect to OTP verification page
    return res.redirect("/verify-otp");
  } catch (err) {
    console.error(err);
    return res.render("users/signup", {
      error: "Something went wrong. Please try again.",
    });
  }
}

export function getverifyOtp(req, res) {
  const signupInfo = req.session.signupInfo;
  res.render("users/otp", { otpExpires: signupInfo.otpExpires, error: null });
}

export async function verifyOtp(req, res) {
  const { otp1, otp2, otp3, otp4 } = req.body;
  const otp = [otp1, otp2, otp3, otp4].filter(Boolean).join("");
  try {
    const { signupInfo } = req.session;
    if (!signupInfo) return res.redirect("/signup");

    // Check OTP validity
    if (!otp || otp.length !== 4 || signupInfo.otp !== otp) {
      return res.render("users/otp", { error: "Invalid OTP", otpExpires: signupInfo.otpExpires });
    }
    if (signupInfo.otpExpires < new Date()) {
      return res.render("users/otp", { error: "OTP expired. Please resend.", otpExpires: signupInfo.otpExpires });
    }

    // Save user only now
    const newUser = new User({
      username: signupInfo.username,
      email: signupInfo.email,
      password: signupInfo.password,
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
        console.error("Session save error:", err);
        return res.render("users/otp", { error: "Something went wrong" });
      }
      delete req.session.signupInfo;
      delete req.session.otp;
      delete req.session.otpExpires;
      res.redirect("/dashboard");
    });
  } catch (err) {
    console.error(err);
    res.render("users/otp", { error: "Something went wrong" });
  }
}

// Resend OTP 
export async function resendOtp(req, res) {
  try {
    // If user is signing up (no user in DB yet), use session info
    if (req.session.signupInfo) {
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
        return res.render("users/otp", { error: "Unable to resend OTP. Try again later." });
      }

      return res.render("users/otp", { otpExpires, error: "New OTP sent to your email" });
    }

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
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

    user.otp = otp;
    user.otpExpires = otpExpires;
    await user.save();

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL, pass: process.env.PASSWORD },
    });
    try {
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: user.email,
        subject: "Your OTP Code",
        text: `Your OTP is ${otp}. It will expire in 10 minutes.`
      });
    } catch (mailError) {
      console.error("Resend user OTP mail failed:", mailError.message);
      return res.render("users/otp2", { error: "Unable to resend OTP. Try again later." });
    }

    // Use otp2 template if in reset flow, else otp
    const view = req.session.resetUserId ? "users/otp2" : "users/otp";
    return res.render(view, { otpExpires: otpExpires || null, error: "New OTP sent to your email" });
  } catch (err) {
    console.error(err);
    return res.render("users/otp", { error: "Unable to resend OTP" });
  }
}

// ------------------ Forgot Password ------------------
export function getforgotPass(req, res) {
  res.render("users/forgotpassword");
}

export async function postforgotPass(req, res) {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.render("users/forgotpassword", { error: "No account found with this email" });

  const otp = otpGenerator.generate(4, {
    digits: true,
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false
  });
  const otpExpires = new Date(Date.now() + 10 * 60 * 1000);

  user.otp = otp;
  user.otpExpires = otpExpires;
  await user.save();

  const transporter = createMailTransporter();
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER || process.env.EMAIL,
      to: user.email,
      subject: "Your Password Reset OTP",
      text: `Your OTP for password reset is ${otp}. It will expire in 10 minutes.`
    });
  } catch (mailError) {
    console.error("Forgot password mail failed:", mailError.message);
    return res.render("users/forgotpassword", { error: "Could not send OTP. Try again later." });
  }

  req.session.resetUserId = user._id;
  res.render("users/otp2", { message: 'otp sent to your email', otpExpires: otpExpires });
}

export async function otpverifyForgot(req, res) {
  try {
    // Combine the 4 OTP inputs
    const { otp1, otp2, otp3, otp4 } = req.body;
    const otp = otp1 + otp2 + otp3 + otp4;

    // Check if OTP is complete
    if (!otp || otp.length !== 4) {
      return res.render("users/otp2", { error: "Please enter the 4-digit OTP." });
    }

    // Get user from session
    const user = await User.findById(req.session.resetUserId);
    if (!user) {
      return res.render("users/otp2", { error: "Session expired. Please try again." });
    }

    const now = new Date();

    // Check if OTP matches and is not expired
    if (user.otp !== otp || user.otpExpires < now) {
      return res.render("users/otp2", { error: "Invalid or expired OTP." });
    }


    // Clear OTP from DB
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    req.session.allowPasswordReset = true;

    res.redirect("/create-password");

  } catch (error) {
    console.error("OTP verification error:", error);
    res.render("users/otp2", { error: "Something went wrong. Please try again." });
  }
}

export function getPassCreation(req, res) {
  res.render("users/createpass");
}
export async function postPassCreation(req, res) {
  try {
    const { password, confirmPassword } = req.body;

    // Check if user is allowed to reset password
    if (!req.session.allowPasswordReset || !req.session.resetUserId) {
      return res.redirect("/forgot-password");
    }

    // Validate passwords
    if (!password || !confirmPassword) {
      return res.render("users/createpass", { error: "Please fill all fields." });
    }

    if (password !== confirmPassword) {
      return res.render("users/createpass", { error: "Passwords do not match." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.findById(req.session.resetUserId);
    if (!user) {
      return res.render("users/createpass", { error: "User not found." });
    }

    user.password = hashedPassword;
    await user.save();

    // Clear session flags
    delete req.session.allowPasswordReset;
    delete req.session.resetUserId;

    // Redirect to login with success message
    res.render("users/login", { message: "Password reset successful. Please login." });

  } catch (error) {
    console.error("Error creating new password:", error);
    res.render("users/createpassword", { error: "Something went wrong. Please try again." });
  }
}

//  Home & Logout
export async function getHome(req, res) {
  if (!req.session.user) return res.redirect("/login");
  const variants = await ProductVariant.find({ productId: products._id });
  try {
    const freshUser = await User.findById(req.session.user.id);
    if (!freshUser) {
      req.session.destroy();
      return res.redirect("/login");
    }

    res.render("users/home", { user: freshUser, image: variants.images });
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
