import async from 'async';
import { Array, pipe, Predicate } from 'effect';
import { RequestHandler } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import mime from 'mime';

import BadRequestError from '~/errors/badRequestError';
import { logger } from '~/infra/logger';

/**
 * A set of allowed MIME types
 */
const ALLOWED_FILE_TYPES: Set<string> = pipe(
  ['png', 'jpg', 'pdf'] as const,
  Array.map(ext => mime.getType(ext)),
  Array.filter(Predicate.isNotNull),
  (types) => new Set(types)
);

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
 *   validateFileType,
 *   antivirusMiddleware,
 *   fileController.create
 * );
 * ```
 */
export const validateFileType: RequestHandler = async (
  request,
  response,
  next
): Promise<void> => {
  try {
    const files = request.file ? [request.file] : request.files;

    // Skip if no file uploaded
    if (!files) {
      next();
      return;
    }

    await async.forEach(files, async (file) => {
      const declaredMimeType = file.mimetype;
      const fileName = file.originalname;
      const fileBuffer = file.buffer;
      const userId = request.user?.id;
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
        throw new BadRequestError();
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
    });

    next();
  } catch (error) {
    next(error);
  }
};

export default validateFileType;
