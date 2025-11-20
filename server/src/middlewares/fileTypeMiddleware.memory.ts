import { Request, Response, NextFunction, RequestHandler } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import { logger } from '~/infra/logger';
import BadRequestError from '~/errors/badRequestError';

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
 * Validates file type for multer uploads stored in memory
 *
 * This middleware should be placed AFTER the multer upload middleware
 * to validate the magic bytes of uploaded files against their declared MIME type.
 *
 * @example
 * ```typescript
 * router.post('/files',
 *   upload(), // multer middleware with memoryStorage
 *   fileTypeMiddleware, // this middleware
 *   antivirusMiddleware,
 *   fileController.create
 * );
 * ```
 */
export const fileTypeMiddleware: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file;

    // Skip if no file uploaded
    if (!file) {
      next();
      return;
    }

    const declaredMimeType = file.mimetype;
    const fileName = file.originalname;
    const fileBuffer = file.buffer;
    const startTime = Date.now();

    logger.info('Validating file type from memory buffer', {
      fileName,
      declaredMimeType,
      size: file.size,
      action: 'validation.started'
    });

    // Detect actual file type from magic bytes
    const detectedType = await fileTypeFromBuffer(fileBuffer);
    const duration = Date.now() - startTime;

    if (!detectedType) {
      logger.warn('Could not detect file type from magic bytes', {
        fileName,
        declaredMimeType
      });
      throw new BadRequestError();
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
      throw new BadRequestError();
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
      throw new BadRequestError(
      );
    }

    logger.info('File type validation successful', {
      fileName,
      fileType: typeName,
      mimeType: detectedType.mime,
      size: file.size,
      duration,
      action: 'validation.completed'
    });

    next();
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      logger.error('Unexpected error in file type validation', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(new BadRequestError());
    }
  }
};

export default fileTypeMiddleware;
