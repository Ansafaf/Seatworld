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

      console.log(
        `[CRON] Coupon expiry job ran. Expired coupons: ${result.modifiedCount}`
      );
    } catch (error) {
      console.error("[CRON] Coupon expiry job failed", error);
    }
  },
  {
    timezone: "Asia/Kolkata"
  }
);
