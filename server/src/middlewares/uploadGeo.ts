import { Request, RequestHandler } from 'express';
import multer from 'multer';
import BadRequestError from '~/errors/badRequestError';
import config from '~/infra/config';

/**
 * Upload middleware for geographic files (shapefiles as ZIP)
 */
export function uploadGeo(): RequestHandler {
  const maxSizeBytes = config.upload.geo.maxSizeMB * 1024 * 1024;

  const ALLOWED_MIMES = new Set([
    'application/zip',
    'application/x-zip-compressed'
  ]);

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
      if (!ALLOWED_MIMES.has(file.mimetype)) {
        return callback(new BadRequestError());
      }
      return callback(null, true);
    }
  });

  return upload.single('file');
}
