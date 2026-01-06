const express = require("express");
const {
  signup,
  login,
  verifyEmail,
  resendVerificationEmail
} = require("../controllers/authController");

const passport = require("passport");

const router = express.Router();

// =================================================
// AUTH
// =================================================
router.post("/signup", signup);               // student / recruiter
router.post("/login", login);                 // all roles
router.post("/forgotPassword", forgotPassword);                 // all roles
router.post("/logout", logout);                 // all roles
router.post("/changePassword", changePassword);                 // all roles
router.get("/verify/:token", verifyEmail);
router.get("/resetPassword/:token", resetPassword);
router.post("/resend-verification", resendVerificationEmail);

// =================================================
// GOOGLE OAUTH (STUDENT ONLY)
// =================================================

router.get("/google", passport.authenticate("google", {
  scope: ["profile", "email"]
}));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    res.redirect(
      `${process.env.GOOGLE_CALLBACK_URL}/login-success?token=${req.user.token}`
    );
  }
);

module.exports = router;
