const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

exports.signup = async (req, res) => {
  try {
    const { firstname, lastname, email, password } = req.body;

    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email already registered" });
    }

    const verifyToken = crypto.randomBytes(32).toString("hex");

    const user = await User.create({
      firstname,
      lastname,
      email,
      password,
      isVerified: false,
      emailVerifyToken: verifyToken,
      emailVerifyExpire: Date.now() + 15 * 60 * 1000,
    });

    console.log("✅ User created:", user._id);
    console.log("✅ Verify token:", verifyToken);
    console.log("✅ Token expires:", new Date(user.emailVerifyExpire));
    console.log("✅ User created with ID:", user._id);
    
    // ⭐ CHECK IF FIELDS WERE SAVED
    const savedUser = await User.findById(user._id);
    console.log("🔍 Saved user data:");
    console.log("  - emailVerifyToken:", savedUser.emailVerifyToken);
    console.log("  - emailVerifyExpire:", savedUser.emailVerifyExpire);
    console.log("  - isVerified:", savedUser.isVerified);
    
    // Update this line - should point to frontend
    const verifyUrl = `${process.env.CLIENT_URL}/api/auth/verify/${verifyToken}`;
    console.log("✅ Verification URL:", verifyUrl);

    const emailHtml = `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Welcome ${firstname} 👋</h2>
        <p>Please verify your email to activate your account.</p>

        <a href="${verifyUrl}"
           style="
            display:inline-block;
            padding:12px 20px;
            background:#4CAF50;
            color:#fff;
            text-decoration:none;
            border-radius:5px;
            margin-top:10px;
           ">
          Verify Email
        </a>

        <p style="margin-top:20px;">
          This link will expire in <b>15 minutes</b>.
        </p>
      </div>
    `;

    console.log("📧 Attempting to send email to:", email);
    console.log("📧 Using EMAIL_USER:", process.env.EMAIL_USER);

    try {
      await sendEmail({
        to: email,
        subject: "Verify Your Email",
        html: emailHtml,
      });
      console.log("✅ ✅ Email sent successfully!");
    } catch (emailError) {
      console.error("❌ ❌ EMAIL FAILED:", emailError.message);
      console.error("Full error:", emailError);
      
      // Don't fail signup if email fails
      return res.status(201).json({
        success: true,
        message: "Signup successful but verification email failed. Please contact support.",
        debug: emailError.message // Remove this in production
      });
    }

    res.status(201).json({
      success: true,
      message: "Signup successful. Please verify your email.",
    });

  } catch (err) {
    console.error("Signup Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    console.log("🔍 Verification attempt with token:", token);

    const user = await User.findOne({
      emailVerifyToken: token,
      emailVerifyExpire: { $gt: Date.now() },
    });

    if (!user) {
      console.log("❌ No user found or token expired");
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    console.log("✅ User found:", user.email);

    user.isVerified = true;
    user.emailVerifyToken = undefined;
    user.emailVerifyExpire = undefined;

    await user.save();

    console.log("✅ User verified successfully:", user.email);

    res.json({
      success: true,
      message: "Email verified successfully",
    });

  } catch (err) {
    console.error("❌ Verify email error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// ✅ ✅ LOGIN API
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");
    if (!user)
      return res.status(404).json({ message: "User not found" });

    // ✅ BLOCK UNVERIFIED USERS
    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before login"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
