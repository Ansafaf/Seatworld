import { User } from "../models/userModel.js";

export const optionalAuth = async (req, res, next) => {
  try {
    let user = null;

    if (req.isAuthenticated?.() && req.user) {
      user = req.user;
    } else if (req.session?.user?.id) {
      user = await User.findById(req.session.user.id);
    }

    if (user) {
      req.user = user;
      res.locals.user = user;
    } else {
      req.user = null;
      res.locals.user = null;
    }

    next();
  } catch (error) {
    console.error("Optional auth error:", error);
    req.user = null;
    res.locals.user = null;
    next();
  }
};
