import mongoose, { isValidObjectId } from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: { type: String, unique: true, sparse: true },

  name: {
    type: String,
    trim: true,
    match: [/^[a-zA-Z\s]{3,50}$/, 'Name must be 3-50 characters and contain only letters and spaces']
  },

  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },

  avatar: { type: String },

  mobile: {
    type: String,
    unique: true,
    sparse: true,
  },

  username: {
    type: String,
    required: function () {
      return this.authType === "local";
    },
    unique: true,
    trim: true,
    match: [/^[a-zA-Z0-9_]{3,20}$/, 'Username must be 3-20 characters and contain only letters, numbers, and underscores']
  },

  password: {
    type: String,
    required: function () {
      return this.authType === "local"; // password not needed for Google accounts
    }
  },

  status: {
    type: String,
    enum: ["active", "blocked"],
    default: "active",
  },

  referralCode: {
    type: String,
    unique: true
  },
  refferedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  },

  isVerified: {
    type: Boolean,
    default: false,
  },

  authType: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },

  otp: { type: String },
  otpExpires: { type: Date },

  tempEmail: { type: String },
  emailChangeOtp: { type: String },
  emailChangeOtpExpiry: { type: Date },

}, { timestamps: true });

export const User = mongoose.model("User", userSchema);
