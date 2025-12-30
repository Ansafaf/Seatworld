import express from 'express';
import { upload, uploadToCloudinary } from '../config/cloudinary.js';

const router = express.Router();

// Single file upload
router.post('/upload', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: 'user_uploads'
    });

    res.json({
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

// Multiple files upload
router.post('/upload-multiple', upload.array('images', 5), async (req, res) => {
  // Handle multiple files
});

export default router;