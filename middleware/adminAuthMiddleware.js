import dotenv from "dotenv";
dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export const adminAuthMiddleware = (req, res, next) => {
  try {
    if (
      req.session?.isAdmin &&
      req.session?.adminEmail === ADMIN_EMAIL
    ) {
      console.log(`[Auth] User authenticated: ${req.session.adminEmail} for ${req.method} ${req.url}`);
      res.locals.admin = {
        email: req.session.adminEmail,
      };
      return next();
    }

    return res.redirect("/admin/login");

  } catch (error) {
    console.error("Admin auth middleware error:", error);
    return res.redirect("/admin/login");
  }
};
