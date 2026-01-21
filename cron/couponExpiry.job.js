import cron from "node-cron";
import Coupon from "../models/couponModel.js";

cron.schedule(
  "0 0 * * *", // every day at 12:00 AM (midnight)
  async () => {
    try {
      const now = new Date();

      const result = await Coupon.updateMany(
        {
          couponStatus: "active",
          expiryDate: { $lt: now }
        },
        {
          $set: { couponStatus: "expired" }
        }
      );

    } catch (error) {
      console.error("[CRON] Coupon expiry job failed", error);
    }
  },
  {
    timezone: "Asia/Kolkata"
  }
);
