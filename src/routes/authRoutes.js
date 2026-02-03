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
const checkEmailVerification = require("../controllers/authController").checkEmailVerification;



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
router.get("/verification-status", auth, checkEmailVerification);


/* ✅ FORGOT PASSWORD (only if functions exist) */
if (forgotPasswordNew) {
  router.post("/forgot-password", forgotPasswordNew);
  router.post("/verify-reset-code", verifyResetCode);
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
    const userData = {
      token: req.user.token,
      id: req.user._id,
      email: req.user.email,
      firstname: req.user.firstname,
      lastname: req.user.lastname,
      role: req.user.role,
      isVerified: req.user.isVerified,
      socialLogin: req.user.socialLogin,
    };
    const userDataBase64 = Buffer.from(JSON.stringify(userData)).toString('base64');
    console.log("CLIENT_URL:", process.env.CLIENT_URL);
    console.log("BACKEND_URL:", process.env.BACKEND_URL);
    res.redirect(
      `${process.env.CLIENT_URL}/login-success?token=${req.user.token}&user=${userDataBase64}`
    );
  }
);

/* =================================================
   🔗 LINKEDIN OAUTH
================================================= */

/* Step 1: Redirect to LinkedIn */
router.get("/linkedin", (req, res) => {
  const state = crypto.randomBytes(16).toString("hex");
  const redirectUri = process.env.LINKEDIN_CALLBACK_URL;

  if (!process.env.LINKEDIN_CLIENT_ID || !process.env.LINKEDIN_CLIENT_SECRET) {
    console.error("❌ LinkedIn credentials not configured in .env");
    return res.status(500).json({ error: "LinkedIn credentials not configured" });
  }

  if (!redirectUri) {
    console.error("❌ LINKEDIN_CALLBACK_URL not configured in .env");
    return res.status(500).json({ error: "Callback URL not configured" });
  }

  //console.log("🔗 LinkedIn OAuth initiated");
  // console.log("📋 Client ID:", process.env.LINKEDIN_CLIENT_ID);
  // console.log("📋 Redirect URI:", redirectUri);

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: "openid profile email",
    state,
  });

  const linkedInAuthUrl = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`;
  console.log("🔗 Redirecting to:", linkedInAuthUrl);
  
  res.redirect(linkedInAuthUrl);
});

/* Step 2: LinkedIn Callback */
router.get("/linkedin/callback", async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) {
      return res.redirect(`${process.env.CLIENT_URL}/login`);
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

    /* Fetch user profile (includes email in OpenID Connect) */
    const profileRes = await axios.get(
      "https://api.linkedin.com/v2/userinfo",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const { given_name, family_name, email, sub } = profileRes.data;

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
        `${process.env.CLIENT_URL}/complete-profile?userId=${user._id}`
      );
    }

    /* Email exists → login */
    user.isVerified = true;
    await user.save();

    const token = generateToken(user._id);
    
    // Prepare user data with token
    const userData = {
      token,
      id: user._id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      isVerified: user.isVerified,
      socialLogin: user.socialLogin,
    };
    
    // Encode user data in base64 for URL
    const userDataBase64 = Buffer.from(JSON.stringify(userData)).toString('base64');
    
    res.redirect(`${process.env.CLIENT_URL}/login-success?token=${token}&user=${userDataBase64}`);
  } catch (error) {
    console.error("❌ LinkedIn OAuth error:", error);
    res.redirect(`${process.env.CLIENT_URL}/login`);
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
        user: {
          id: existingUser._id,
          email: existingUser.email,
          firstname: existingUser.firstname,
          lastname: existingUser.lastname,
          role: existingUser.role,
          isVerified: existingUser.isVerified,
          socialLogin: existingUser.socialLogin,
        },
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
      user: {
        id: tempUser._id,
        email: tempUser.email,
        firstname: tempUser.firstname,
        lastname: tempUser.lastname,
        role: tempUser.role,
        isVerified: tempUser.isVerified,
        socialLogin: tempUser.socialLogin,
      },
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