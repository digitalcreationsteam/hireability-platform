const GoogleStrategy = require("passport-google-oauth20").Strategy;
// const LinkedInStrategy = require("passport-linkedin-oauth2").Strategy; //// Linkedin
const passport = require("passport");
const User = require("../models/userModel");
const generateToken = require("../utils/generateToken");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;
console.log("Google profile:", profile);
        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            firstname: profile.name.givenName || "Google",
            lastname: profile.name.familyName || "User",
            email,
            role: "student",
            socialLogin: "google",
            isVerified: true,
            password: "google_oauth",
          });
        }

        const token = generateToken(user._id);
        user.token = token;
console.log("Google profile:", user);

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

/* =====================================================
   SESSION SERIALIZATION - REQUIRED FOR PASSPORT
===================================================== */
passport.serializeUser((user, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

///LinkedIN:
// Note: LinkedIn OAuth is handled manually in routes/authRoutes.js
// because LinkedIn's OpenID Connect endpoint requires custom flow
