// routes/authRoutes.js - FIXED VERSION
const express = require("express");
const router = express.Router(); // Make sure this is Express Router

// Import all your dependencies
const passport = require("passport");
const axios = require("axios");
const crypto = require("crypto");

// Import controller functions ONE BY ONE to avoid any import issues
const signup = require("../controllers/authController").signup;
const login = require("../controllers/authController").login;
const verifyEmail = require("../controllers/authController").verifyEmail;
const resendVerificationEmail = require("../controllers/authController").resendVerificationEmail;
const logout = require("../controllers/authController").logout;
const getUserStatus = require("../controllers/authController").getUserStatus;
const verifyRouteEndpoint = require("../controllers/authController").verifyRouteEndpoint;

// Import forgot password functions if they exist
let forgotPasswordNew, verifyResetCode, resetPasswordNew;
try {
  const authController = require("../controllers/authController");
  forgotPasswordNew = authController.forgotPasswordNew;
  verifyResetCode = authController.verifyResetCode;
  resetPasswordNew = authController.resetPasswordNew;
} catch (error) {
  console.log("Forgot password functions not found, continuing without them");
}

// Import auth middleware
const auth = require("../middlewares/auth");

const User = require("../models/userModel");
const generateToken = require("../utils/generateToken");

/* =================================================
   ✅ EMAIL / PASSWORD AUTH
================================================= */
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);

/* ✅ EMAIL VERIFICATION */
router.get("/verify/:token", verifyEmail);
router.post("/resend-verification", resendVerificationEmail);

/* ✅ NAVIGATION STATUS (Protected routes) */
router.get("/user-status", auth, getUserStatus);
router.post("/verify-route", auth, verifyRouteEndpoint);

/* ✅ FORGOT PASSWORD (only if functions exist) */
if (forgotPasswordNew) {
  router.post("/forgot-password", forgotPasswordNew);
  router.post("/verify-reset-otp", verifyResetCode);
  router.post("/reset-password", resetPasswordNew);
}

/* =================================================
   🔐 GOOGLE OAUTH
================================================= */
router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// @route   GET /auth/google/callback
// @desc    Google callback route
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to frontend
    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  }
);

// @route   GET /auth/logout
// @desc    Logout user
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.redirect(process.env.CLIENT_URL);
  });
});

// @route   GET /auth/current_user
// @desc    Get current logged in user
router.get('/current_user', (req, res) => {
  res.json(req.user || null);
});


/* =================================================
   🔗 LINKEDIN OAUTH
================================================= */

/* Step 1: Redirect to LinkedIn */
router.get("/linkedin", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
    scope: "openid profile email",
    state,
  });

  res.redirect(
    `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  );
});

/* Step 2: LinkedIn Callback */
router.get("/linkedin/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }

    /* Exchange code → access token */
    const tokenRes = await axios.post(
      "https://www.linkedin.com/oauth/v2/accessToken",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
        client_id: process.env.LINKEDIN_CLIENT_ID,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET,
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const accessToken = tokenRes.data.access_token;

    /* Fetch OpenID profile */
    const profileRes = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const { given_name, family_name, sub } = profileRes.data;

    /* Try fetching email */
    let email = null;
    try {
      const emailRes = await axios.get(
        "https://api.linkedin.com/v2/emailAddress?q=members&projection=(elements*(handle~))",
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      email = emailRes.data.elements?.[0]?.["handle~"]?.emailAddress || null;
    } catch {
      console.log("⚠️ LinkedIn email not available");
    }

    console.log("👉 LinkedIn Profile - Sub:", sub, "Email:", email);

    /* Find or create user */
    let user = await User.findOne({ linkedinId: sub });

    if (!user) {
      const tempPassword = crypto.randomBytes(32).toString("hex");

      user = await User.create({
        firstname: given_name || "LinkedIn",
        lastname: family_name || "User",
        email: email || `linkedin_${sub}_${Date.now()}@temp.local`,
        password: tempPassword,
        role: "student",
        socialLogin: "linkedin",
        linkedinId: sub,
        isVerified: !!email,
      });

      console.log("✅ LinkedIn user created:", user._id);
    } else {
      console.log("ℹ️ LinkedIn user found:", user._id);
    }

    /* No email → ask user to complete profile */
    if (!email) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/complete-profile?userId=${user._id}`
      );
    }

    /* Email exists → login */
    user.isVerified = true;
    await user.save();

    const token = generateToken(user._id);
    res.redirect(`${process.env.FRONTEND_URL}/login-success?token=${token}`);
  } catch (error) {
    console.error("❌ LinkedIn OAuth error:", error);
    res.redirect(`${process.env.FRONTEND_URL}/login`);
  }
});

/* Step 3: Complete LinkedIn Profile */
router.post("/linkedin/complete", async (req, res) => {
  try {
    const { userId, email, firstName, lastName } = req.body;

    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: "User ID and email required",
      });
    }

    const tempUser = await User.findById(userId);
    if (!tempUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const existingUser = await User.findOne({ email });

    /* Case 1: Email exists → merge */
    if (existingUser && existingUser._id.toString() !== userId) {
      existingUser.linkedinId = tempUser.linkedinId;
      existingUser.socialLogin = "linkedin";
      existingUser.isVerified = true;

      await existingUser.save();
      await User.findByIdAndDelete(userId);

      const token = generateToken(existingUser._id);

      return res.json({
        success: true,
        merged: true,
        token,
        user: existingUser,
      });
    }

    /* Case 2: Email not used → update user */
    tempUser.email = email;
    tempUser.firstname = firstName || tempUser.firstname;
    tempUser.lastname = lastName || tempUser.lastname;
    tempUser.isVerified = true;

    await tempUser.save();

    const token = generateToken(tempUser._id);

    res.json({
      success: true,
      merged: false,
      token,
      user: tempUser,
    });
  } catch (error) {
    console.error("❌ LinkedIn complete error:", error);
    res.status(500).json({
      success: false,
      message: "Something went wrong",
    });
  }
});

module.exports = router;