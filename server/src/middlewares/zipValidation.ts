import { Request, Response, NextFunction, RequestHandler } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import { logger } from '~/infra/logger';
import BadRequestError from '~/errors/badRequestError';

/**
 * ZIP file magic bytes signatures
 *
 * Standard ZIP: 50 4B 03 04
 * Empty ZIP: 50 4B 05 06
 * Spanned ZIP: 50 4B 07 08
 */
const ZIP_SIGNATURES = [
  [0x50, 0x4b, 0x03, 0x04], // Standard ZIP
  [0x50, 0x4b, 0x05, 0x06], // Empty archive
  [0x50, 0x4b, 0x07, 0x08]  // Spanned archive
];

/**
 * Validates that uploaded file is actually a ZIP file using magic bytes
 *
 * This middleware should be placed AFTER the multer upload middleware
 * to validate the magic bytes of uploaded ZIP files.
 *
 * @example
 * ```typescript
 * router.post('/geo/perimeters',
 *   uploadGeo(), // multer middleware
 *   zipValidationMiddleware, // this middleware
 *   antivirusMiddleware,
 *   geoController.createGeoPerimeter
 * );
 * ```
 */
export const zipValidationMiddleware: RequestHandler = async (
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

    logger.info('Validating ZIP file type', {
      fileName,
      declaredMimeType,
      size: file.size,
      action: 'zip_validation.started'
    });

    // Check magic bytes manually for ZIP
    const hasZipSignature = ZIP_SIGNATURES.some(signature =>
      signature.every((byte, index) => fileBuffer[index] === byte)
    );
    const duration = Date.now() - startTime;

    if (!hasZipSignature) {
      logger.warn('File is not a valid ZIP archive (magic bytes check failed)', {
        fileName,
        declaredMimeType,
        firstBytes: Array.from(fileBuffer.slice(0, 4)).map((b: number) => b.toString(16).padStart(2, '0')).join(' ')
      });
      throw new BadRequestError();
    }

    // Also use file-type for additional validation
    const detectedType = await fileTypeFromBuffer(fileBuffer);

    if (detectedType && detectedType.ext !== 'zip') {
      logger.warn('File type mismatch - not a ZIP file', {
        fileName,
        declaredMimeType,
        detectedType: detectedType.mime
      });
      throw new BadRequestError();
    }

    logger.info('ZIP file validation successful', {
      fileName,
      size: file.size,
      duration,
      action: 'zip_validation.completed'
    });

    next();
  } catch (error) {
    next(error);
  }
};

export default zipValidationMiddleware;
