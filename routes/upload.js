import express from "express";
import { upload } from "../config/cloudinary.js";
const router = express.Router();

// Single image upload
router.post("/upload", upload.single("image"), (req, res) => {
  res.json({
    message: "Image uploaded successfully",
    imageUrl: req.file.path, // Cloudinary gives you URL
  });
});

// Multiple images upload
router.post("/multi-upload", upload.array("images", 5), (req, res) => {
  const urls = req.files.map(file => file.path);
  res.json({
    message: "Images uploaded successfully",
    imageUrls: urls,
  });
});


export default router;
