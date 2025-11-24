import { Request, RequestHandler } from 'express';
import multer from 'multer';
import BadRequestError from '~/errors/badRequestError';

/**
 * Upload middleware using memory storage for security validation
 *
 * Files are stored in memory (buffer) to allow validation before S3 upload:
 * 1. File type validation (magic bytes)
 * 2. Antivirus scanning
 * 3. Upload to S3 only if all checks pass
 */
export function upload(): RequestHandler {
  const ALLOWED_MIMES = ['image/png', 'image/jpeg', 'application/pdf'];

  // Get max size from env or default to 5MB
  const maxSizeMB = parseInt(process.env.FILE_UPLOAD_MAX_SIZE_MB || '5', 10);
  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  const upload = multer({
    // Use memory storage instead of direct S3 upload
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
      // Basic MIME check (will be validated again with magic bytes)
      if (!ALLOWED_MIMES.includes(file.mimetype)) {
        return callback(new BadRequestError());
      }
      return callback(null, true);
    }
  });

  return upload.single('file');
}
