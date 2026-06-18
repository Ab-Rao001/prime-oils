import { Readable } from 'stream';
import { configureCloudinary } from '../config/cloudinary.js';
import logger from './logger.js';

export function uploadImageBuffer(buffer, options = {}) {
  const cloudinary = configureCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'prime-oil/products',
        resource_type: 'image',
        ...options,
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );

    Readable.from(buffer).pipe(uploadStream);
  });
}

export async function destroyImage(publicId) {
  if (!publicId) return;
  const cloudinary = configureCloudinary();
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
  } catch (err) {
    logger.warn(`Cloudinary destroy failed for ${publicId}: ${err.message}`);
  }
}
