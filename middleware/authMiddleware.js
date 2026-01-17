import { User } from "../models/userModel.js";

export const authMiddleware = async (req, res, next) => {
  try {
    let user = null;

    if (req.isAuthenticated?.() && req.user) { // Passport-managed user

      user = req.user;
    } else if (req.session?.user?.id) {            // Manual session user

      user = await User.findById(req.session.user.id);
    }

    if (!user) {
      if (req.xhr || req.headers.accept?.includes("application/json")) {
        return res.status(401).json({ success: false, message: "Login required" });
      }

      if (req.session) {
        req.session.destroy((err) => {
          if (err) console.error("Session destroy error:", err);
          res.clearCookie("connect.sid");
          return res.redirect("/login");
        });
      } else {
        return res.redirect("/login");
      }
    } else {

      req.user = user;
      res.locals.user = user;
      return next();
    }
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.redirect("/login");
  }
};
