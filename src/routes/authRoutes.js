const express = require("express");
const { signup, login , verifyEmail} = require("../controllers/authController_old");
const passport = require("passport");

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.get("/verify/:token", verifyEmail);


// ✅ Google OAuth
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    res.redirect(`http://localhost:5000/login-success?token=${req.user.token}`);
  }
);

module.exports = router;
