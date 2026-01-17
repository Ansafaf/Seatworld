import { User } from "../models/userModel.js";

export const requireAuth = async (req, res, next) => {
  try {
    let user = null;

    if (req.isAuthenticated?.() && req.user) {
      user = req.user;
    } else if (req.session?.user?.id) {
      user = await User.findById(req.session.user.id);
    }

    if (!user) {
      // Check if it's an AJAX/fetch request
      if (req.xhr || req.headers.accept?.includes("application/json") || req.get("X-Requested-With") === "XMLHttpRequest") {
        return res.status(401).json({
          success: false,
          message: "Authentication required",
          redirectUrl: "/login"
        });
      }

      // Normal page request
      return res.redirect("/login");
    }

    req.user = user;
    res.locals.user = user;
    next();

  } catch (error) {
    console.error("requireAuth middleware error:", error);
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
    return res.redirect("/login");
  }
};
