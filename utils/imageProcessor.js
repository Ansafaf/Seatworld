import sharp from 'sharp';

/**
 * Process and optimize image using Sharp
 * @param {Buffer} buffer - Image buffer from multer
 * @param {Object} options - Processing options
 * @returns {Promise<Buffer>} - Processed image buffer
 */
export const processImage = async (buffer, options = {}) => {
    try {
        const {
            maxWidth = 1200,
            maxHeight = 1200,
            quality = 85,
            format = 'jpeg'
        } = options;

        // Process image: resize and optimize
        const processedBuffer = await sharp(buffer)
            .resize(maxWidth, maxHeight, {
                fit: 'inside', // Maintain aspect ratio
                withoutEnlargement: true // Don't upscale small images
            })
            .toFormat(format, { quality })
            .toBuffer();

        return processedBuffer;
    } catch (error) {
        console.error('Error processing image:', error);
        throw new Error('Failed to process image');
    }
};

/**
 * Validate image file
 * @param {Object} file - Multer file object
 * @returns {Boolean} - True if valid
 */
export const validateImage = (file) => {
    const allowedFormats = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10MB

    if (!allowedFormats.includes(file.mimetype)) {
        throw new Error('Invalid file format. Only JPG, PNG, and WebP are allowed.');
    }

    if (file.size > maxSize) {
        throw new Error('File size too large. Maximum size is 10MB.');
    }

    return true;
};
