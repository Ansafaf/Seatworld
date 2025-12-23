import bcrypt from "bcrypt";
import { User } from "../models/userModel.js";
import { Address } from "../models/addressModel.js";
import otpGenerator from "otp-generator";
import nodemailer from "nodemailer";
import validator from "validator";


export async function getProfile(req, res) {
  const customer = await User.findById(req.session.user.id);
  res.render("users/profile", { user: customer });
}

export async function getprofileEdit(req, res) {
  const customer = await User.findById(req.session.user.id || req.session.user._id);
  res.render("users/personalInfo", { user: customer });
}
export async function postprofileEdit(req, res) {
  try {
    const { name, mobile } = req.body;
    const userId = req.session.user.id;

    const customer = await User.findById(userId);
    if (!customer) {
      return res.redirect("/login");
    }

    // 🟡 No change check
    const currentName = customer.name || customer.username;

    if (
      currentName === name &&
      (customer.mobile || "") === (mobile || "")
    ) {
      req.session.message = { type: 'info', message: "You did not change anything" };
      return res.redirect("/profile/edit");
    }

    // ✅ Allow mobile update for ALL users (including Google)
    const updateData = {
      name,
      mobile
    };

    await User.findByIdAndUpdate(userId, updateData);

    req.session.message = { type: 'success', message: "Successfully updated profile info" };
    return res.redirect("/profile/edit");

  } catch (error) {
    console.error(error);
    req.session.message = { type: 'error', message: "Something went wrong" };
    return res.redirect("/profile/edit");
  }
}

export async function updateProfile(req, res) {
  try {
    if (!req.file) {
      req.session.message = { type: 'error', message: "file not uploaded" };
      return res.redirect("/profile");
    }

    await User.findByIdAndUpdate(req.session.user.id, {
      avatar: req.file.path, // cloudinary or local path

    });

    req.session.message = { type: 'success', message: "profile picture updated" };
    res.redirect("/profile");
  } catch (err) {
    console.error(err);
    res.redirect("/profile");
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
      currentEmail: user.email
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
      req.session.message = { type: 'warning', message: "Your current email id and new email id are same" };
      return res.redirect("/profile/change-email")
    }
    if (newEmail !== confirmEmail) {
      req.session.message = { type: 'error', message: "Your email not matching" };
      return res.redirect("/profile/change-email")
    }
    const isAvailable = await User.findOne({ email: newEmail });
    if (isAvailable) {
      req.session.message = { type: 'error', message: "Entered email id is already exist" };
      return res.redirect("/profile/change-email");
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

    await transporter.sendMail({
      from: process.env.EMAIL,
      to: newEmail,
      subject: "Your OTP Code",
      text: `Your Otp is ${otp}. It will expire in 5 minutes`
    })
    if (newEmail == confirmEmail) {
      user.tempEmail = newEmail;
      user.emailChangeOtp = otp;
      user.emailChangeOtpExpiry = otpExpires;
      await user.save();
    }

    req.session.message = { type: 'success', message: "Otp has been send successfully" };
    res.redirect("/email/change-otp");
  }
  catch (mailError) {
    console.log(mailError);
    req.session.message = { type: 'error', message: "Internal Server cant generate mail right now" };
    res.redirect("/profile/change-email");
  }

}


export async function getEmailOtp(req, res) {
  try {
    // Check if user is logged in
    if (!req.session.user || !req.session.user.id) {
      req.session.message = { type: 'error', message: "Please login first" };
      return res.redirect("/login");
    }

    // Find user to get actual OTP expiry
    const user = await User.findById(req.session.user.id);

    if (!user) {
      req.session.message = { type: 'error', message: "User not found" };
      return res.redirect("/login");
    }

    // Get the actual OTP expiry from user document
    const otpExpires = user.emailChangeOtpExpiry;

    res.render("users/otp3", {
      otpExpires,
      user
    });
  } catch (error) {
    console.error("Get email OTP error:", error);
    res.render("users/otp3", {
      message: { type: 'error', message: "An error occurred. Please try again." }
    });
  }
}

export async function postEmailOtp(req, res) {
  try {
    const { otp1, otp2, otp3, otp4 } = req.body;

    // Check if user is logged in
    if (!req.session.user || !req.session.user.id) {
      req.session.message = { type: 'error', message: "Please login first" };
      return res.redirect("/login");
    }

    // Find user first to get otpExpires for all error cases
    const user = await User.findById(req.session.user.id);

    // Check if user exists
    if (!user) {
      req.session.message = { type: 'error', message: "User not found" };
      return res.redirect("/login");
    }

    // Get otpExpires from user document
    const otpExpires = user.emailChangeOtpExpiry;

    // Validate OTP inputs exist - PASS otpExpires
    if (!otp1 || !otp2 || !otp3 || !otp4) {
      res.locals.message = { type: 'error', message: "Please enter all 4 digits of the OTP." };
      return res.render("users/otp3", {
        otpExpires // Add this
      });
    }

    // Combine OTP digits
    const otp = `${otp1}${otp2}${otp3}${otp4}`;

    // Validate OTP format (4 digits, numeric) - PASS otpExpires
    if (!otp || otp.length !== 4 || !/^\d{4}$/.test(otp)) {
      res.locals.message = { type: 'error', message: "Please enter a valid 4-digit numeric OTP." };
      return res.render("users/otp3", {
        otpExpires // Add this
      });
    }

    // Check if user has email change OTP data
    if (!user.emailChangeOtp || !user.emailChangeOtpExpiry) {
      res.locals.message = { type: 'error', message: "No OTP found. Please request a new OTP." };
      return res.render("users/otp3", {
        otpExpires: null
      });
    }

    // Check OTP expiry
    const now = Date.now();
    const expiryTime = new Date(user.emailChangeOtpExpiry).getTime();

    if (now > expiryTime) {
      // Clear expired OTP
      user.emailChangeOtp = null;
      user.emailChangeOtpExpiry = null;
      await user.save();

      res.locals.message = { type: 'error', message: "OTP has expired. Please request a new OTP." };
      return res.render("users/otp3", {
        otpExpires: null
      });
    }

    // Verify OTP exists before comparing
    if (!user.emailChangeOtp) {
      res.locals.message = { type: 'error', message: "OTP not found. Please request a new OTP." };
      return res.render("users/otp3", {
        otpExpires: user.emailChangeOtpExpiry
      });
    }

    // Verify OTP matches
    if (user.emailChangeOtp !== otp) {
      // Optional: Track failed attempts
      user.otpAttempts = (user.otpAttempts || 0) + 1;

      // Lock after 3 failed attempts
      if (user.otpAttempts >= 3) {
        user.emailChangeOtp = null;
        user.emailChangeOtpExpiry = null;
        await user.save();

        res.locals.message = { type: 'error', message: "Too many failed attempts. Please request a new OTP." };
        return res.render("users/otp3", {
          otpExpires: null
        });
      }

      await user.save();
      res.locals.message = { type: 'error', message: "Invalid OTP. Please try again." };
      return res.render("users/otp3", {
        attemptsLeft: 3 - user.otpAttempts,
        otpExpires: user.emailChangeOtpExpiry
      });
    }

    // Check if temp email exists - PASS otpExpires
    if (!user.tempEmail) {
      return res.render("users/otp3", {
        message: { type: 'error', message: "Email change request not found. Please start over." },
        otpExpires // Add this
      });
    }

    // Update email
    const oldEmail = user.email;
    user.email = user.tempEmail;

    // Cleanup OTP data
    user.tempEmail = null;
    user.emailChangeOtp = null;
    user.emailChangeOtpExpiry = null;
    user.otpAttempts = 0;

    await user.save();

    // Optional: Send confirmation email to new email
    // await sendEmailConfirmation(user.email);

    req.session.message = { type: 'success', message: "Email updated successfully" };
    return res.redirect("/profile/edit");

  } catch (error) {
    console.error("Email OTP verification error:", error);

    //this Prevent double response
    if (res.headersSent) {
      return;
    }

    let otpExpires = null;

    try {
      const user = await User.findById(req.session.user?.id);
      otpExpires = user?.emailChangeOtpExpiry || null;
    } catch (err) {
      // ignore DB error here
    }

    return res.render("users/otp3", {
      message: { type: 'error', message: "An error occurred. Please try again." },
      otpExpires
    });
  }
}

export async function getAddresslist(req, res) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = 6;
    const skip = (page - 1) * limit;

    // Fetch paginated addresses of logged-in user
    const addresses = await Address.find({
      userId: req.session.user.id
    })
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    // Count total addresses for this user
    const totalAddresses = await Address.countDocuments({
      userId: req.session.user.id
    });

    const totalPages = Math.ceil(totalAddresses / limit);

    res.render("users/addressList", {
      addresses,
      currentPage: page,
      totalPages
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

    req.session.message = { type: 'success', message: "Default address updated successfully" };
    res.redirect('/address');
  } catch (error) {
    console.error("Set default address error:", error);
    req.session.message = { type: 'error', message: "Failed to set default address" };
    res.redirect('/address');
  }
}

export async function getAddaddress(req, res) {
  res.render("users/addressAdd");
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
    req.session.message = { type: 'success', message: "New Address added successfully" };
    res.redirect("/address")
  }
  catch (err) {
    console.log("Error in address adding");

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

    res.render("users/editAddress", { address });
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
      mobile
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
      req.session.message = { type: 'error', message: "Address not found or unauthorized" };
      return res.redirect(`/address`);
    }

    req.session.message = { type: 'success', message: "Address edited successfully" };
    res.redirect(`/address`);
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'error', message: "Error editing address" };
    res.redirect(`/address`);
  }
}

export async function deleteAddress(req, res) {
  try {
    const addressId = req.params.id;
    const userId = req.session.user.id;
    const address = await Address.findOne({ _id: addressId, userId: userId })

    if (!address) {
      req.session.message = { type: 'error', message: "Address not found" };
      return res.redirect("/address");
    }
    // Count total addresses
    const addressCount = await Address.countDocuments({ userId });
    if (addressCount === 1) {
      req.session.message = { type: 'warning', message: "You must have at least one address" };
      return res.redirect("/address");
    }
    if (address.isDefault) {
      req.session.message = { type: 'warning', message: "Default address cannot be deleted" };
      return res.redirect("/address");
    }

    await Address.deleteOne({ _id: addressId, userId });

    req.session.message = { type: 'success', message: "Address deleted successfully" };
    res.redirect("/address");
  } catch (err) {
    console.error(err);
    req.session.message = { type: 'error', message: "Failed to delete address" };
    res.redirect("/address");
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

  res.render("users/passChange");
}


export async function postupdatePass(req, res) {
  try {
    const userId = req.session.user.id;
    const { currentPass, newPass, confirmPass } = req.body;

    // Check if all fields are provided
    if (!currentPass || !newPass || !confirmPass) {
      req.session.message = { type: 'error', message: "All fields are required" };
      return res.redirect("/password-change");
    }

    // Validate new password length
    if (newPass.length < 8) {
      req.session.message = { type: 'error', message: "New password must be at least 8 characters" };
      return res.redirect("/password-change");
    }



    // Check if new password and confirm password match
    if (newPass !== confirmPass) {
      req.session.message = { type: 'error', message: "Passwords do not match" };
      return res.redirect("/password-change");
    }

    const user = await User.findById(userId);
    if (!user) {
      req.session.message = { type: 'error', message: "User not found" };
      return res.redirect("/login");
    }

    // Check if user is a Google user (can't change password)
    if (user.authType === "google") {
      req.session.message = { type: 'warning', message: "You cannot change password for Google Sign-In accounts" };
      return res.redirect("/password-change");
    }

    //CORRECT: Use bcrypt.compare() to verify current password
    const isCurrentPasswordCorrect = await bcrypt.compare(currentPass, user.password);
    if (!isCurrentPasswordCorrect) {
      req.session.message = { type: 'error', message: "Current password is incorrect" };
      return res.redirect("/password-change");
    }

    // Check if new password is same as current password
    const isSameAsOldPassword = await bcrypt.compare(newPass, user.password);
    if (isSameAsOldPassword) {
      req.session.message = { type: 'error', message: "New password cannot be the same as your current password" };
      return res.redirect("/password-change");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPass, 10);

    // Update user password
    user.password = hashedPassword;
    await user.save();

    // Optional: Log password change activity
    console.log(`Password changed for user: ${user.email} at ${new Date().toISOString()}`);

    // Redirect with success message
    req.session.message = { type: 'success', message: "Password updated successfully" };
    return res.redirect("/profile");

  } catch (error) {
    console.error("Error updating password:", error);
    req.session.message = { type: 'error', message: "Something went wrong. Please try again" };
    return res.redirect("/password-change");
  }
}