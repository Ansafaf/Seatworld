import dotenv from "dotenv";
dotenv.config();

export const adminAuthMiddleware = (req, res, next) => {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.AdminMail;

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

    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(401).json({ success: false, message: "Session expired. Please login again." });
    }

    return res.redirect("/admin/login");

  } catch (error) {
    console.error("Admin auth middleware error:", error);
    if (req.xhr || req.headers.accept?.includes("application/json")) {
      return res.status(500).json({ success: false, message: "Authentication error" });
    }
    return res.redirect("/admin/login");
  }
};
