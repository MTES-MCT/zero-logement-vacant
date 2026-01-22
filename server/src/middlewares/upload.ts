import { Request, RequestHandler } from 'express';
import mime from 'mime';
import multer from 'multer';

import { InvalidFileTypeError } from '~/errors/InvalidFileTypeError';

export interface UploadOptions {
  /**
   * The accepted file extensions (without dot).
   * @default ['png', 'jpg', 'pdf']
   */
  accept?: string[];
  /**
   * @default 1
   */
  maxSizeMiB?: number;
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
  const acceptedExtensions: Set<string> = new Set(
    options?.accept ?? DEFAULT_ALLOWED_EXTENSIONS
  );

  const maxSizeMiB = options?.maxSizeMiB ?? 1;
  const maxSizeBytes = maxSizeMiB * 1024 ** 2;

  const upload = multer({
    // Use memory storage instead of direct S3 upload
    storage: multer.memoryStorage(),

    limits: {
      files: 10,
      fileSize: maxSizeBytes
    },

    fileFilter(
      request: Request,
      file: Express.Multer.File,
      callback: multer.FileFilterCallback
    ) {
      // Validate by normalized file extension instead of MIME type.
      // MIME types are unreliable across browsers/OS (e.g., Windows/Chrome
      // sends 'application/x-zip-compressed' while macOS/Firefox sends
      // 'application/zip' for the same .zip file).
      // Content will be validated again with magic bytes downstream.
      // Bypass validation if multiple files are allowed
      // to validate later and provide a list of errors.
      const fileType = mime.getType(file.originalname);
      const fileExtension = fileType ? mime.getExtension(fileType) : null;

      if (!options?.multiple && !fileExtension) {
        return callback(
          new InvalidFileTypeError({
            filename: file.originalname,
            accepted: Array.from(acceptedExtensions).map((ext) => `.${ext}`)
          })
        );
      }

      if (
        !options?.multiple &&
        fileExtension &&
        !acceptedExtensions.has(fileExtension)
      ) {
        return callback(
          new InvalidFileTypeError({
            filename: file.originalname,
            accepted: Array.from(acceptedExtensions).map((ext) => `.${ext}`)
          })
        );
      }
      return callback(null, true);
    }
  });

  return options?.multiple ? upload.array('files') : upload.single('file');
}
