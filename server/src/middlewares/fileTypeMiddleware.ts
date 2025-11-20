import { Request, Response, NextFunction } from 'express';
import { FileArray, UploadedFile } from 'express-fileupload';
import { fileTypeFromBuffer } from 'file-type';
import { logger } from '~/infra/logger';

/**
 * Allowed file types with their MIME types and magic bytes signatures
 */
const ALLOWED_FILE_TYPES = {
  png: {
    mimeTypes: ['image/png'] as string[],
    signature: [0x89, 0x50, 0x4e, 0x47] // PNG signature: 89 50 4E 47
  },
  jpg: {
    mimeTypes: ['image/jpeg', 'image/jpg'] as string[],
    signature: [0xff, 0xd8, 0xff] // JPEG signature: FF D8 FF
  },
  pdf: {
    mimeTypes: ['application/pdf'] as string[],
    signature: [0x25, 0x50, 0x44, 0x46] // PDF signature: 25 50 44 46 (%PDF)
  }
};

/**
 * Error class for file type validation failures
 */
export class FileTypeValidationError extends Error {
  constructor(
    message: string,
    public readonly fileName: string,
    public readonly declaredMimeType: string,
    public readonly detectedType?: string
  ) {
    super(message);
    this.name = 'FileTypeValidationError';
  }
}

/**
 * Validates a single uploaded file against its declared MIME type
 *
 * @param file - The uploaded file to validate
 * @throws {FileTypeValidationError} If validation fails
 */
async function validateFileType(file: UploadedFile): Promise<void> {
  const declaredMimeType = file.mimetype;
  const fileName = file.name;

  logger.info('Validating file type', {
    fileName,
    declaredMimeType,
    size: file.size
  });

  // Detect actual file type from magic bytes
  const detectedType = await fileTypeFromBuffer(file.data);

  if (!detectedType) {
    logger.warn('Could not detect file type from magic bytes', {
      fileName,
      declaredMimeType
    });
    throw new FileTypeValidationError(
      'Unable to determine file type from content',
      fileName,
      declaredMimeType
    );
  }

  logger.debug('File type detected', {
    fileName,
    declaredMimeType,
    detectedMimeType: detectedType.mime,
    detectedExtension: detectedType.ext
  });

  // Check if detected type is allowed
  const allowedType = Object.entries(ALLOWED_FILE_TYPES).find(
    ([, config]) => config.mimeTypes.includes(detectedType.mime)
  );

  if (!allowedType) {
    logger.warn('Detected file type is not allowed', {
      fileName,
      declaredMimeType,
      detectedMimeType: detectedType.mime
    });
    throw new FileTypeValidationError(
      `File type ${detectedType.mime} is not allowed`,
      fileName,
      declaredMimeType,
      detectedType.mime
    );
  }

  // Verify that declared MIME matches detected MIME
  const [typeName, typeConfig] = allowedType;
  if (!typeConfig.mimeTypes.includes(declaredMimeType)) {
    logger.warn('MIME type mismatch detected (possible spoofing)', {
      fileName,
      declaredMimeType,
      detectedMimeType: detectedType.mime,
      action: 'rejected'
    });
    throw new FileTypeValidationError(
      `Declared MIME type (${declaredMimeType}) does not match actual file type (${detectedType.mime})`,
      fileName,
      declaredMimeType,
      detectedType.mime
    );
  }

  logger.info('File type validation successful', {
    fileName,
    fileType: typeName,
    mimeType: detectedType.mime
  });
}

/**
 * Express middleware to validate uploaded file types using magic bytes
 *
 * This middleware prevents MIME type spoofing by checking the actual file
 * content (magic bytes) against the declared MIME type.
 *
 * Supported file types:
 * - PNG (image/png)
 * - JPEG (image/jpeg, image/jpg)
 * - PDF (application/pdf)
 *
 * @example
 * ```typescript
 * app.post('/upload',
 *   fileUpload(),
 *   fileTypeMiddleware,
 *   uploadController
 * );
 * ```
 */
export async function fileTypeMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Skip if no files uploaded
    if (!req.files || Object.keys(req.files).length === 0) {
      next();
      return;
    }

    const files = req.files as unknown as FileArray;
    const validationPromises: Promise<void>[] = [];

    // Validate all uploaded files
    for (const fieldName of Object.keys(files)) {
      const fileOrFiles = files[fieldName];

      if (Array.isArray(fileOrFiles)) {
        // Multiple files in same field
        fileOrFiles.forEach((file) => {
          validationPromises.push(validateFileType(file));
        });
      } else {
        // Single file
        validationPromises.push(validateFileType(fileOrFiles));
      }
    }

    // Wait for all validations to complete
    await Promise.all(validationPromises);

    next();
  } catch (error) {
    if (error instanceof FileTypeValidationError) {
      logger.error('File type validation failed', {
        fileName: error.fileName,
        declaredMimeType: error.declaredMimeType,
        detectedType: error.detectedType,
        message: error.message
      });

      res.status(400).json({
        error: 'Invalid file type',
        message: error.message,
        fileName: error.fileName
      });
    } else {
      logger.error('Unexpected error in file type validation', {
        error: error instanceof Error ? error.message : String(error)
      });

      res.status(500).json({
        error: 'Internal server error during file validation'
      });
    }
  }
}

export default fileTypeMiddleware;
