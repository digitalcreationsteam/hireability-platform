const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const validator = require("validator");

const userSchema = new mongoose.Schema(
  {
    firstname: { type: String, required: true, trim: true },

    lastname: {
      type: String,
      trim: true,
      default: "",
    },

    lastLogin: {
      type: Date,
      default: null,
    },
    // Add these fields for Google OAuth
    googleId: {
      type: String,
      sparse: true // Allows null values while keeping unique constraint
    },

    email: {
      type: String,
      required: function () {
        return !this.googleId;
      },// Required only if not using Google
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, "Invalid email"],
    },

    password: {
      type: String,
      required: function () {
        return !this.googleId;
      }, // Required only if not using Google
      minlength: 6,
      select: false,
    },

    // ✅ ROLE FIELD
    role: {
      type: String,
      enum: ["student", "recruiter", "admin"],
      default: "student",
    },

    country: {
      type: String, // "IN", "US", "UK"
      default: "India",
    },

    socialLogin: { type: String, default: null },

    isVerified: { type: Boolean, default: false },

    emailVerifyToken: String,
    emailVerifyExpire: Date,

    /* ================= FORGOT PASSWORD (OTP) ================= */
    forgotPasswordOTP: {
      type: String,
    },
    forgotPasswordOTPExpire: {
      type: Date,
    },
  },
  { timestamps: true }
);
/* ============================================================= */

// ✅ ✅ ✅ WORKING PRE SAVE HOOK (NO NEXT!)
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// ✅ PASSWORD MATCH METHOD
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// // ✅ PASSWORD MATCH METHOD
// userSchema.methods.matchPassword = async function (enteredPassword) {
//   return await bcrypt.compare(enteredPassword, this.password);
// };

module.exports = mongoose.model("User", userSchema);
