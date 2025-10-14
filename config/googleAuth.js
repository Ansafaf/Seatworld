import passport from "passport";
import {User} from "../models/userModel.js"
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import dotenv from "dotenv";

dotenv.config();

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5000/auth/google/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({googleId: profile.id});
      if(!user)
      {
         user = new User({
         googleId: profile.id,
         name: profile.displayName,
         email: profile.emails[0].value,
         avatar: profile.photos[0].value
        });
        await user.save();
      } 
      return done(null,user)
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
