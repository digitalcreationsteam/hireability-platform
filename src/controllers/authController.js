const User = require("../models/userModel");
const bcrypt = require("bcryptjs");
const generateToken = require("../utils/generateToken");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");



exports.signup = async (req, res) => {
  try {
    const { firstname, lastname, email, password, role } = req.body;

    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // ✅ ROLE VALIDATION
    const allowedRoles = ["student", "recruiter"];
    const userRole = allowedRoles.includes(role) ? role : "student";

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
      role: userRole,              // ✅ SAFE ROLE
      isVerified: false,
      emailVerifyToken: verifyToken,
      emailVerifyExpire: Date.now() + 15 * 60 * 1000,
    });

    const verifyUrl = `${process.env.CLIENT_URL}/api/auth/verify/${verifyToken}`;

    await sendEmail({
      to: email,
      subject: "Verify Your Email",
      html: `
        <h2>Welcome ${firstname}</h2>
        <a href="${verifyUrl}">Verify Email</a>
      `,
    });

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

exports.resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🚫 Already verified
    if (user.isVerified) {
      return res.status(400).json({
        message: "Email already verified"
      });
    }

    // 🔁 Generate new token
    const verifyToken = crypto.randomBytes(32).toString("hex");

    user.emailVerifyToken = verifyToken;
    user.emailVerifyExpire = Date.now() + 7 * 24 * 60 * 60 * 1000; // ✅ 7 days
    await user.save();

    const verifyUrl = `${process.env.CLIENT_URL}/api/auth/verify/${verifyToken}`;

    const emailHtml = `
      <div style="font-family: Arial; padding: 20px;">
        <h2>Hello ${user.firstname} 👋</h2>
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
          This link will expire in <b>7 days</b>.
        </p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: "Resend Email Verification",
      html: emailHtml,
    });

    console.log("🔁 Verification email resent to:", email);

    res.json({
      success: true,
      message: "Verification email resent successfully"
    });

  } catch (err) {
    console.error("❌ Resend verification error:", err);
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

    if (!user.isVerified) {
      return res.status(403).json({
        message: "Please verify your email before login",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // ✅ CORRECT TOKEN
    const token = generateToken(user);

    // ✅ REMOVE PASSWORD
    user.password = undefined;

    res.json({
      success: true,
      token,
      user,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 🔐 Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpire = Date.now() + 15 * 60 * 1000; // 15 mins
    await user.save();

    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

    await sendEmail({
      to: email,
      subject: "Reset Your Password",
      html: `
        <h2>Hello ${user.firstname}</h2>
        <p>Click below to reset your password:</p>
        <a href="${resetUrl}">Reset Password</a>
        <p>This link will expire in 15 minutes.</p>
      `,
    });

    res.json({
      success: true,
      message: "Password reset link sent to email",
    });

  } catch (err) {
    console.error("Forgot Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword) {
      return res.status(400).json({ message: "All fields required" });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match" });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    res.json({
      success: true,
      message: "Password reset successful",
    });

  } catch (err) {
    console.error("Reset Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select("+password");

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Old password incorrect" });
    }

    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });

  } catch (err) {
    console.error("Change Password Error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.logout = async (req, res) => {
  try {
    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
};






