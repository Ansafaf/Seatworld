import express from "express";
import passport from "../config/googleAuth.js";
import logger from "../utils/logger.js";

const router = express.Router();

// Start Google auth flow
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Callback URL
router.get("/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      logger.error("Passport Auth Error:", err);
      return next(err);
    }
    if (!user) {
      // Handle failure (e.g., blocked user)
      req.session.message = {
        type: 'error',
        message: info ? info.message : "Authentication failed"
      };
      return res.redirect("/login");
    }
    // Handle success
    req.logIn(user, (err) => {
      if (err) return next(err);

      req.session.user = {
        id: user._id || user.id,
        name: user.name,
        email: user.email
      };
      logger.info("✅ Logged in user:", user);
      res.redirect("/home");
    });
  })(req, res, next);
});

export default router;
