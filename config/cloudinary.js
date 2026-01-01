import { v2 as cloudinary } from "cloudinary";
import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import dotenv from "dotenv";

dotenv.config();

// Validate required environment variables
const requiredEnvVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  // Don't throw in production to avoid crashing, but log appropriately
  if (process.env.NODE_ENV === 'development') {
    throw new Error(`Missing environment variables: ${missingEnvVars.join(', ')}`);
  }
}

// Configure Cloudinary with additional options for better performance
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS in production
  // Add timeout for Atlas/cloud environments
  timeout: 60000, // 60 seconds timeout
});

// Option 1: Memory storage (good for processing images before upload)
const memoryStorage = multer.memoryStorage();


// Create upload middleware with different configurations based on environment
const createUploadMiddleware = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  const baseConfig = {
    limits: {
      fileSize: isProduction ? 10 * 1024 * 1024 : 5 * 1024 * 1024, // 10MB prod, 5MB dev
      files: 10, // Max number of files
    },
    fileFilter: (req, file, cb) => {
      const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

      if (!allowedFormats.includes(file.mimetype)) {
        const error = new Error('Invalid file format. Only JPG, PNG, WebP, and GIF are allowed.');
        error.code = 'INVALID_FILE_FORMAT';
        return cb(error, false);
      }

      // Additional validation for production
      if (isProduction && file.size > 10 * 1024 * 1024) {
        const error = new Error('File size exceeds 10MB limit');
        error.code = 'FILE_TOO_LARGE';
        return cb(error, false);
      }

      cb(null, true);
    },
    // Handle errors gracefully for cloud environments
    onError: (err, next) => {
      console.error('Multer error:', err);
      next(err);
    }
  };

  // Use memory storage for more control over image processing
  return multer({
    storage: memoryStorage,
    ...baseConfig
  });
};

// Create upload instance
const upload = createUploadMiddleware();

// Helper function to upload buffer to Cloudinary (when using memory storage)
const uploadToCloudinary = async (fileBuffer, options = {}) => {
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: process.env.NODE_ENV === 'production' ? 'prod_uploads' : 'dev_uploads',
          resource_type: 'auto',
          timeout: 60000,
          ...options
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  } catch (error) {
    console.error('Error in uploadToCloudinary:', error);
    throw error;
  }
};

// Helper function to delete from Cloudinary
const deleteFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      invalidate: true,
      resource_type: 'image'
    });
    return result;
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

// Export everything you might need
export {
  cloudinary,
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  memoryStorage
};

// Export a default object for convenience
export default {
  cloudinary,
  upload,
  uploadToCloudinary,
  deleteFromCloudinary,
  memoryStorage
};