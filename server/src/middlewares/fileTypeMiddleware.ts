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
 * Validates file type for uploaded files
 *
 * This middleware validates the magic bytes of uploaded files against their declared MIME type.
 * It works with multer memory storage and should be placed AFTER the multer upload middleware.
 *
 * @example
 * ```typescript
 * router.post('/files',
 *   upload.single('file'),
 *   fileTypeMiddleware,
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
    const userId = req.user?.id;
    const startTime = Date.now();

    logger.info('Validating file type from memory buffer', {
      fileName,
      declaredMimeType,
      size: file.size,
      userId,
      action: 'validation.started'
    });

    // Detect actual file type from magic bytes
    const detectedType = await fileTypeFromBuffer(fileBuffer);
    const duration = Date.now() - startTime;

    if (!detectedType) {
      logger.warn('Could not detect file type from magic bytes', {
        fileName,
        declaredMimeType,
        userId
      });
      throw new BadRequestError();
    }

    logger.debug('File type detected', {
      fileName,
      declaredMimeType,
      detectedMimeType: detectedType.mime,
      detectedExtension: detectedType.ext,
      userId
    });

    // Check if detected type is allowed
    const allowedType = Object.entries(ALLOWED_FILE_TYPES).find(
      ([, config]) => config.mimeTypes.includes(detectedType.mime)
    );

    if (!allowedType) {
      logger.warn('Detected file type is not allowed', {
        fileName,
        declaredMimeType,
        detectedMimeType: detectedType.mime,
        userId
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
        userId,
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
      userId,
      duration,
      action: 'validation.completed'
    });

    next();
  } catch (error) {
    next(error);
  }
};

export default fileTypeMiddleware;
