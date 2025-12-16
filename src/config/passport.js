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

        // ✅ IF USER DOES NOT EXIST → CREATE VERIFIED USER
        if (!user) {
          user = await User.create({
            firstname: profile.name.givenName,
            lastname: profile.name.familyName,
            email,
            socialLogin: "google",
            isVerified: true,        // ✅ GOOGLE USERS ARE AUTO VERIFIED
            password: undefined     // ✅ NO FAKE PASSWORD
          });
        }

        // ✅ GENERATE JWT
        const token = generateToken(user._id);

        // ✅ ATTACH TOKEN TO USER OBJECT FOR CALLBACK REDIRECT
        user.token = token;

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);
