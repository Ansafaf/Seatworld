import mongoose from "mongoose";

const wishlistSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true
    },

    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true
    }
  },
  {
    timestamps: true // creates createdAt & updatedAt automatically
  }
);


wishlistSchema.index({ userId: 1, variantId: 1 }, { unique: true });

export default mongoose.model("Wishlist", wishlistSchema);
