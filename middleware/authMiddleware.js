import { User } from "../models/userModel.js";

export const authMiddleware = async (req, res, next) => {
  try {
    let user = null;

    if (req.isAuthenticated?.() && req.user) {
      user = req.user;
    } else if (req.session?.user?.id) {
      user = await User.findById(req.session.user.id);
    }

    if (!user) {
      // AJAX / fetch request
      if (req.headers.accept?.includes("application/json")) {
        return res.status(401).json({
          success: false,
          message: "Login required"
        });
      }

      // Normal request
      if (req.session) {
        req.session.destroy(() => {
          res.clearCookie("connect.sid");
          return res.redirect("/login");
        });
      } else {
        return res.redirect("/login");
      }
    }

    req.user = user;
    res.locals.user = user;
    next();

  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.redirect("/login");
  }
};
