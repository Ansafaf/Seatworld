import passport from "passport";
import { User } from "../models/userModel.js"
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";
import { generateReferralCode } from "../utils/generateReferral.js";

dotenv.config();

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: `${process.env.URL}/auth/google/callback`
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      if (!user) {
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          avatar: profile.photos[0].value,
          authType: "google",
          referralCode: generateReferralCode(profile.displayName)
        });
        await user.save();
      }
      if (user.status === "blocked") {
        return done(null, false, {
          message: "Your account has been blocked by the admin. Please contact support."
        });
      }
      return done(null, user)
    } catch (err) {
      return done(err, null);
    }
  }
));
passport.serializeUser((user, done) => {
  done(null, user.googleId); // only store ID
});

passport.deserializeUser(async (id, done) => {
  try {
    // Replace this with DB lookup
    const user = await User.findOne({ googleId: id });
    done(null, user);
  } catch (err) {
    done(err, null);
  }
});

export default passport;
