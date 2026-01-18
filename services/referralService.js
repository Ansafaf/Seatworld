import { User } from "../models/userModel.js";
import { generateReferralCode } from "../utils/generateReferral.js";


export const createReferralForUser = async (userId) => {
    const user = await User.findOne({ _id: userId });

    if (!user) {
        throw new Error("User not found");
    }

    if (!user.referralCode) {
        user.referralCode = generateReferralCode(user.name || user.username);
        await user.save({ validateBeforeSave: false });
    }

    return user.referralCode;
}

