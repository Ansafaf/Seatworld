import { User } from "../models/userModel.js";

export const optionalAuth = async (req, res, next) => {
  try {
    let user = null;

    // Passport login
    if (req.isAuthenticated?.() && req.user) {
      user = req.user;
    }
    // Session login
    else if (req.session?.user?.id) {
      user = await User.findById(req.session.user.id);
    }

    if (user) {
      req.user = user;
      res.locals.user = user;
    } else {
      res.locals.user = null; // important for EJS
    }

    next(); // ALWAYS continue
  } catch (error) {
    console.error("Optional auth error:", error);
    res.locals.user = null;
    next();
  }
};
