const GoogleStrategy = require("passport-google-oauth20").Strategy;
const passport = require("passport");
const User = require("../models/userModel");
const generateToken = require("../utils/generateToken");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "/api/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails[0].value;

        let user = await User.findOne({ email });

        if (!user) {
          user = await User.create({
            firstname: profile.name.givenName,
            lastname: profile.name.familyName,
            email,
            role: "student",            // ✅ DEFAULT ROLE
            socialLogin: "google",
            isVerified: true,
            password: "google_oauth",   // ✅ REQUIRED (see problem 2)
          });
        }

        // ✅ PASS FULL USER OBJECT
        const token = generateToken(user);

        user.token = token;

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

