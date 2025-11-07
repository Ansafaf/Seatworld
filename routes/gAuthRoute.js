import express from "express";
import passport from "../config/googleAuth.js";  

const router = express.Router();

// Start Google auth flow
router.get("/google",
  passport.authenticate("google",{ scope: ["profile", "email"]})
);

// Callback URL
router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    req.session.user={
      id: req.user.id,
      name: req.user.name,
      email: req.user.email
    }
    console.log("✅ Logged in user:", req.user); 
    res.redirect("/dashboard");
  }
);

export default router;
