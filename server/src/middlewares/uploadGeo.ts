import { Request, RequestHandler } from 'express';
import multer from 'multer';
import BadRequestError from '~/errors/badRequestError';

/**
 * Upload middleware for geographic files (shapefiles as ZIP)
 *
 * Environment variables:
 * - GEO_UPLOAD_MAX_SIZE_MB: Maximum file size in MB (default: 100)
 */
export function uploadGeo(): RequestHandler {
  // Get max size from env or default to 100MB
  const maxSizeMB = parseInt(process.env.GEO_UPLOAD_MAX_SIZE_MB || '100', 10);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const ALLOWED_MIMES = ['application/zip', 'application/x-zip-compressed'];

  const upload = multer({
    // Use memory storage for security validation
    storage: multer.memoryStorage(),

    limits: {
      files: 1,
      fileSize: maxSizeBytes
    },

    fileFilter(
      request: Request,
      file: Express.Multer.File,
      callback: multer.FileFilterCallback
    ) {
      // Basic MIME check for ZIP files
      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        return callback(new BadRequestError(`Invalid file type. Expected ZIP file, got ${file.mimetype}`));
      }
      return callback(null, true);
    }
  });

  return upload.single('file');
}
