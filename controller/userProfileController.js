import bcrypt from "bcrypt";
import { uploadToCloudinary } from "../config/cloudinary.js";
import { User } from "../models/userModel.js";
import { Address } from "../models/addressModel.js";
import { paginate } from "../utils/paginationHelper.js";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import validator from "validator";
import { buildBreadcrumb } from "../utils/breadcrumb.js";
import Coupon from "../models/couponModel.js";


export async function getProfile(req, res) {
  const customer = await User.findById(req.session.user.id);
  res.render("users/profile", {
    user: customer,
    breadcrumbs: buildBreadcrumb([
      { label: "Profile", url: "/profile" }
    ])
  });
}

export async function getprofileEdit(req, res) {
  const customer = await User.findById(req.session.user.id || req.session.user._id);
  res.render("users/personalInfo", {
    user: customer,
    breadcrumbs: buildBreadcrumb([
      { label: "Profile", url: "/profile" },
      { label: "Edit Profile", url: "/profile/edit" }
    ])
  });
}
export async function postprofileEdit(req, res) {
  try {
    const { name, mobile } = req.body;

    // Use req.user which is populated by authMiddleware
    const customer = req.user;
    if (!customer) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized. Please login again.",
        redirectUrl: "/login"
      });
    }

    const currentName = customer.name || customer.username;

    if (
      currentName === name &&
      (customer.mobile || "") === (mobile || "")
    ) {
      return res.status(200).json({
        success: false,
        message: "You did not change anything",
        noChange: true
      });
    }

    // Check if mobile already exists for ANOTHER user
    if (mobile && mobile !== customer.mobile) {
      const existingMobile = await User.findOne({ mobile, _id: { $ne: customer._id } });
      if (existingMobile) {
        return res.status(400).json({
          success: false,
          message: "Mobile number already in use by another account"
        });
      }
    }

    // Update the customer object
    customer.name = name;
    customer.mobile = mobile;
    await customer.save();

    // Re-populate session if name changed (since it might be used elsewhere)
    if (req.session.user) {
      req.session.user.name = name;
    }

    return res.status(200).json({
      success: true,
      message: "Successfully updated profile info",
      redirectUrl: "/profile"
    });

  } catch (error) {
    console.error("Profile Edit Error:", error);
    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while updating profile"
    });
  }
}

export async function updateProfile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File not uploaded"
      });
    }

    // Process image with Sharp
    const { processImage } = await import('../utils/imageProcessor.js');
    const processedBuffer = await processImage(req.file.buffer, {
      maxWidth: 400,
      maxHeight: 400,
      format: 'jpeg'
    });

    // Upload to Cloudinary using helper
    const result = await uploadToCloudinary(processedBuffer, {
      folder: 'avatars'
    });
    const imageUrl = result.secure_url;

    await User.findByIdAndUpdate(req.session.user.id, {
      avatar: imageUrl
    });

    if (req.session.user) {
      req.session.user.avatar = imageUrl;
    }

    return res.status(200).json({
      success: true,
      message: "Profile picture updated successfully",
      avatarUrl: imageUrl
    });
  } catch (err) {
    console.error("Profile picture update error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to update profile picture"
    });
  }
};

export async function getEmailchange(req, res) {
  try {
    if (!req.session.user) {
      return res.redirect("/login");
    }

    const user = await User.findById(req.session.user.id);

    if (!user) {
      return res.redirect("/login");
    }

    // Google sign-in restriction
    if (user.authType === "google") {
      req.session.message = { type: 'warning', message: "Email address cannot be changed because this account was created using Google Sign-In" };
      return res.redirect("/profile/edit");
    }

    return res.render("users/emailUpdation", {
      user: req.user,
      currentEmail: user.email,
      breadcrumbs: buildBreadcrumb([
        { label: "Profile", url: "/profile" },
        { label: "Edit Profile", url: "/profile/edit" },
        { label: "Change Email", url: "/profile/change-email" }
      ])
    });

  } catch (error) {
    console.error("Email change page error:", error);
    res.locals.message = { type: 'error', message: "Something went wrong" };
    return res.redirect("/profile");
  }
}


export async function postEmailchange(req, res) {
  try {
    let user = await User.findById(req.session.user.id);
    const { newEmail, confirmEmail } = req.body;
    if (user.email == newEmail) {
      return res.status(400).json({
        success: false,
        message: "Your current email id and new email id are same"
      });
    }
    if (newEmail !== confirmEmail) {
      return res.status(400).json({
        success: false,
        message: "Your email not matching"
      });
    }
    const isAvailable = await User.findOne({ email: newEmail });
    if (isAvailable) {
      return res.status(400).json({
        success: false,
        message: "Entered email id is already exist"
      });
    }
    const otp = otpGenerator.generate(4, {
      digits: true,
      lowerCaseAlphabets: false,
      upperCaseAlphabets: false,
      specialChars: false
    });
    const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL, pass: process.env.PASSWORD }
    })

    try {
      await transporter.sendMail({
        from: process.env.EMAIL,
        to: newEmail,
        subject: "Your OTP Code",
        text: `Your Otp is ${otp}. It will expire in 5 minutes`
      });
    } catch (mailError) {
      console.error(mailError);
      return res.status(500).json({
        success: false,
        message: "Internal Server cant generate mail right now"
      });
    }

    user.tempEmail = newEmail;
    user.emailChangeOtp = otp;
    user.emailChangeOtpExpiry = otpExpires;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Otp has been sent successfully",
      redirectUrl: "/email/change-otp"
    });
  }
  catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong"
    });
  }
}


export async function getEmailOtp(req, res) {
  try {
    // Check if user is logged in
    if (!req.session.user || !req.session.user.id) {
      req.session.message = { type: 'error', message: "Please login first" };
      return res.redirect("/login");
    }


    const user = await User.findById(req.session.user.id);

    if (!user) {
      req.session.message = { type: 'error', message: "User not found" };
      return res.redirect("/login");
    }

    const otpExpires = user.emailChangeOtpExpiry;

    res.render("users/otp3", {
      otpExpires,
      user,
      breadcrumbs: buildBreadcrumb([
        { label: "Profile", url: "/profile" },
        { label: "Edit Profile", url: "/profile/edit" },
        { label: "Change Email", url: "/profile/change-email" },
        { label: "Verify OTP", url: "/email/change-otp" }
      ])
    });

  } catch (error) {
    console.error("Get email OTP error:", error);
    res.render("users/otp3", {
      message: { type: 'error', message: "An error occurred. Please try again." },
      breadcrumbs: buildBreadcrumb([
        { label: "Profile", url: "/profile" },
        { label: "Edit Profile", url: "/profile/edit" },
        { label: "Change Email", url: "/profile/change-email" },
        { label: "Verify OTP", url: "/email/change-otp" }
      ])
    });
  }
}

export async function postEmailOtp(req, res) {
  try {
    const { otp1, otp2, otp3, otp4 } = req.body;

    if (!req.session.user || !req.session.user.id) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
        redirectUrl: "/login"
      });
    }

    const user = await User.findById(req.session.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        redirectUrl: "/login"
      });
    }

    if (!otp1 || !otp2 || !otp3 || !otp4) {
      return res.status(400).json({
        success: false,
        message: "Please enter all 4 digits of the OTP."
      });
    }

    const otp = `${otp1}${otp2}${otp3}${otp4}`;

    if (!otp || otp.length !== 4 || !/^\d{4}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid 4-digit numeric OTP."
      });
    }

    if (!user.emailChangeOtp || !user.emailChangeOtpExpiry) {
      return res.status(400).json({
        success: false,
        message: "No OTP found. Please request a new OTP."
      });
    }

    const now = Date.now();
    const expiryTime = new Date(user.emailChangeOtpExpiry).getTime();

    if (now > expiryTime) {
      user.emailChangeOtp = null;
      user.emailChangeOtpExpiry = null;
      await user.save();

      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new OTP."
      });
    }


    if (user.emailChangeOtp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP. Please try again."
      });
    }

    if (!user.tempEmail) {
      return res.status(400).json({
        success: false,
        message: "Email change request not found. Please start over."
      });
    }

    user.email = user.tempEmail;

    // Cleanup OTP data
    user.tempEmail = null;
    user.emailChangeOtp = null;
    user.emailChangeOtpExpiry = null;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Email updated successfully",
      redirectUrl: "/profile/edit"
    });

  } catch (error) {
    console.error("Email OTP verification error:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred. Please try again."
    });
  }
}

export async function getAddresslist(req, res) {
  try {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 8;

    const { items: addresses, pagination } = await paginate(Address, { userId }, {
      page,
      limit,
      sort: { createdAt: -1 }
    });

    res.render("users/addressList", {
      user: req.user,
      addresses,
      pagination,
      breadcrumbs: buildBreadcrumb([
        { label: "Profile", url: "/profile" },
        { label: "Address List", url: "/address" }
      ])
    });

  } catch (error) {
    console.error("Error fetching address list:", error);
    req.session.message = { type: 'error', message: "Something went wrong" };
    res.redirect("/profile");
  }
}
export async function postDefaultAddres(req, res) {
  try {
    const addressId = req.params.id;
    const userId = req.session.user.id;

    // Remove default flag from all addresses of this user
    await Address.updateMany(
      { userId: userId },
      { $set: { isDefault: false } }
    );

    // Set the selected address as default
    await Address.findByIdAndUpdate(addressId, {
      $set: { isDefault: true }
    });

    return res.status(200).json({
      success: true,
      message: "Default address updated successfully",
      redirectUrl: "/address"
    });
  } catch (error) {
    console.error("Set default address error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to set default address"
    });
  }
}

export async function getAddaddress(req, res) {
  res.render("users/addressAdd", {
    user: req.user,
    breadcrumbs: buildBreadcrumb([
      { label: "Profile", url: "/profile" },
      { label: "Address List", url: "/address" },
      { label: "Add Address", url: "/address/add" }
    ])
  });
}
export async function postAddaddress(req, res) {
  try {
    const id = req.session.user.id;
    const { name, housename, street, city, state, country, pincode, mobile } = req.body;
    const address = new Address({
      userId: id,
      name,
      housename,
      street,
      city,
      state,
      country,
      pincode,
      mobile
    })
    await address.save();
    return res.status(200).json({
      success: true,
      message: "New Address added successfully",
      redirectUrl: "/address"
    });
  }
  catch (err) {
    console.error("Error in address adding", err);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while adding address"
    });
  }
}

export const getEditAddress = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const addressId = req.params.id;

    const address = await Address.findOne({
      _id: addressId,
      userId: userId
    });

    if (!address) {
      req.session.message = { type: 'error', message: "Address not found" };
      return res.redirect("/address");
    }

    const returnTo = req.query.returnTo || null;

    res.render("users/editAddress", {
      user: req.user,
      address,
      returnTo,
      breadcrumbs: buildBreadcrumb([
        { label: "Profile", url: "/profile" },
        { label: "Address List", url: "/address" },
        { label: "Edit Address", url: `/address/edit/${addressId}` }
      ])
    });
  } catch (err) {
    console.error(err);
    res.redirect("/address");
  }
};

export async function postEditAddress(req, res) {
  try {
    const addressId = req.params.id;
    const userId = req.session.user.id;

    const {
      name,
      housename,
      street,
      city,
      state,
      country,
      pincode,
      mobile,
      returnTo
    } = req.body;

    const updated = await Address.findOneAndUpdate(
      { _id: addressId, userId: userId }, // ownership check
      {
        name,
        housename,
        street,
        city,
        state,
        country,
        pincode,
        mobile
      },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({
        success: false,
        message: "Address not found or unauthorized"
      });
    }

    let redirectUrl = "/address";
    if (returnTo === 'checkout') {
      redirectUrl = "/checkout";
    }

    return res.status(200).json({
      success: true,
      message: "Address edited successfully",
      redirectUrl: redirectUrl
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Error editing address"
    });
  }
}

export async function deleteAddress(req, res) {
  try {
    const addressId = req.params.id;
    const userId = req.session.user.id;
    const address = await Address.findOne({ _id: addressId, userId: userId })

    if (!address) {
      return res.status(404).json({
        success: false,
        message: "Address not found"
      });
    }
    // Count total addresses
    const addressCount = await Address.countDocuments({ userId });
    if (addressCount === 1) {
      return res.status(400).json({
        success: false,
        message: "You must have at least one address"
      });
    }
    if (address.isDefault) {
      return res.status(400).json({
        success: false,
        message: "Default address cannot be deleted"
      });
    }

    await Address.deleteOne({ _id: addressId, userId });

    return res.status(200).json({
      success: true,
      message: "Address deleted successfully",
      redirectUrl: "/address"
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      success: false,
      message: "Failed to delete address"
    });
  }
}

export async function getupdatePass(req, res) {
  const userId = req.session.user.id;
  const user = await User.findById(userId);

  if (!user) {
    return res.redirect("/login");
  }

  if (user.authType === "google") {
    req.session.message = { type: 'warning', message: "You can’t change your password because your account was created using Google Sign-In" };
    return res.redirect("/profile");
  }

  res.render("users/passChange", {
    user: req.user,
    breadcrumbs: buildBreadcrumb([
      { label: "Profile", url: "/profile" },
      { label: "Change Password", url: "/password-change" }
    ])
  });
}


export async function postupdatePass(req, res) {
  try {
    const userId = req.session.user.id;
    const { currentPass, newPass, confirmPass } = req.body;

    // Check if all fields are provided
    if (!currentPass || !newPass || !confirmPass) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }

    // Validate new password length
    if (newPass.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters"
      });
    }

    // Check if new password and confirm password match
    if (newPass !== confirmPass) {
      return res.status(400).json({
        success: false,
        message: "Passwords do not match"
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
        redirectUrl: "/login"
      });
    }

    // Check if user is a Google user (can't change password)
    if (user.authType === "google") {
      return res.status(403).json({
        success: false,
        message: "You cannot change password for Google Sign-In accounts"
      });
    }

    //CORRECT: Use bcrypt.compare() to verify current password
    const isCurrentPasswordCorrect = await bcrypt.compare(currentPass, user.password);
    if (!isCurrentPasswordCorrect) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect"
      });
    }

    // Check if new password is same as current password
    const isSameAsOldPassword = await bcrypt.compare(newPass, user.password);
    if (isSameAsOldPassword) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as your current password"
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPass, 10);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Optional: Log password change activity
    console.log(`Password changed for user: ${user.email} at ${new Date().toISOString()}`);

    return res.status(200).json({
      success: true,
      message: "Password updated successfully",
      redirectUrl: "/profile"
    });

  } catch (error) {
    console.error("Error updating password:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong. Please try again"
    });
  }
}

export async function getCoupons(req, res) {
  try {
    const userId = req.session.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = 6; // Matching the 6 slots in the design image

    // Optional: Only show active coupons that haven't expired
    const query = {
      couponStatus: "active",
      expiryDate: { $gt: new Date() }
    };

    const { items: coupons, pagination } = await paginate(Coupon, query, {
      page,
      limit,
      sort: { createdAt: -1 }
    });

    const customer = await User.findById(userId);

    res.render("users/couponList", {
      user: customer,
      coupons,
      pagination,
      active: 'coupons',
      breadcrumbs: buildBreadcrumb([
        { label: "Profile", url: "/profile" },
        { label: "My Coupons", url: "/coupons" }
      ])
    });
  } catch (error) {
    console.error("Error fetching user coupons:", error);
    res.redirect("/profile");
  }
}
