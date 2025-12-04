import { createS3 } from '@zerologementvacant/utils/node';
import { Predicate } from 'effect';
import { Request, RequestHandler } from 'express';
import mime from 'mime';
import multer from 'multer';
import BadRequestError from '~/errors/badRequestError';
import config from '~/infra/config';

export interface UploadOptions {
  /**
   * The accepted file extensions (without dot).
   * @default ['png', 'jpg', 'pdf']
   */
  accept?: string[];
  /**
   * @default 1
   */
  maxSizeMB?: number;
  /**
   * Whether to accept multiple files.
   * @default false
   */
  multiple?: boolean;
}

const DEFAULT_ALLOWED_EXTENSIONS = ['png', 'jpg', 'pdf'];

/**
 * Upload middleware using memory storage for security validation
 *
 * Files are stored in memory (buffer) to allow validation before S3 upload:
 * 1. File type validation (magic bytes)
 * 2. Antivirus scanning
 * 3. Upload to S3 only if all checks pass
 */
export function upload(options?: UploadOptions): RequestHandler {
  const types: ReadonlyArray<string> = (
    options?.accept ?? DEFAULT_ALLOWED_EXTENSIONS
  )
    .map((ext) => mime.getType(ext))
    .filter(Predicate.isNotNull);

  const maxSizeBytes = config.upload.maxSizeMB * 1024 * 1024;

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
      if (!types.includes(file.mimetype)) {
        return callback(new BadRequestError());
      }
      return callback(null, true);
    }
  });

  return options?.multiple ? upload.array('files') : upload.single('file');
}
