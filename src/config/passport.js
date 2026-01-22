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

///LinkedIN:

// passport.use(
//   new LinkedInStrategy(
//     {
//       clientID: process.env.LINKEDIN_CLIENT_ID,
//       clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
//       callbackURL: process.env.LINKEDIN_CALLBACK_URL,
//       scope: ["openid", "profile", "email"],
//     },
//     async (accessToken, refreshToken, profile, done) => {
//       try {
//         const email =
//           profile.emails?.[0]?.value || profile._json?.email || null;

//         if (!email) {
//           return done(new Error("LinkedIn email not available"), null);
//         }

//         let user = await User.findOne({ email });

//         if (!user) {
//           user = await User.create({
//             firstname: profile.name?.givenName || "LinkedIn",
//             lastname: profile.name?.familyName || "User",
//             email,
//             role: "student",
//             socialLogin: "linkedin",
//             linkedinId: profile.id,
//             isVerified: true,
//             password: "linkedin_oauth",
//           });
//         }

//         const token = generateToken(user);
//         user.token = token;

//         done(null, user);
//       } catch (err) {
//         done(err, null);
//       }
//     }
//   )
// );
