const GoogleStrategy = require("passport-google-oauth20").Strategy;
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

        const token = generateToken(user);
        user.token = token;

        done(null, user);
      } catch (err) {
        done(err, null);
      }
    }
  )
);

