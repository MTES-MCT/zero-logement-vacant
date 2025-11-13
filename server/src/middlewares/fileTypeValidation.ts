import { Request, Response, NextFunction, RequestHandler } from 'express';
import { fileTypeFromBuffer } from 'file-type';
import { logger } from '~/infra/logger';
import BadRequestError from '~/errors/badRequestError';
import { S3 } from '@aws-sdk/client-s3';
import config from '~/infra/config';
import { createS3 } from '@zerologementvacant/utils/node';

/**
 * Allowed file types with their MIME types and magic bytes signatures
 */
const ALLOWED_FILE_TYPES = {
  png: {
    mimeTypes: ['image/png'],
    signature: [0x89, 0x50, 0x4e, 0x47] // PNG signature: 89 50 4E 47
  },
  jpg: {
    mimeTypes: ['image/jpeg', 'image/jpg'],
    signature: [0xff, 0xd8, 0xff] // JPEG signature: FF D8 FF
  },
  pdf: {
    mimeTypes: ['application/pdf'],
    signature: [0x25, 0x50, 0x44, 0x46] // PDF signature: 25 50 44 46 (%PDF)
  }
} as const;

/**
 * Validates file type for multer uploads stored in S3
 *
 * This middleware should be placed AFTER the multer upload middleware
 * to validate the magic bytes of uploaded files against their declared MIME type.
 *
 * @example
 * ```typescript
 * router.post('/files',
 *   upload(), // multer middleware
 *   validateUploadedFileType, // this middleware
 *   fileController.create
 * );
 * ```
 */
export const validateUploadedFileType: RequestHandler = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const file = req.file as Express.MulterS3.File;

    // Skip if no file uploaded
    if (!file) {
      next();
      return;
    }

    const declaredMimeType = file.contentType || file.mimetype;
    const fileName = file.originalname;
    const fileKey = file.key;

    logger.info('Validating uploaded file type', {
      fileName,
      fileKey,
      declaredMimeType,
      size: file.size
    });

    // Download file from S3 to validate magic bytes
    const s3: S3 = createS3({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey
    });

    const response = await s3.getObject({
      Bucket: config.s3.bucket,
      Key: fileKey
    });

    if (!response.Body) {
      logger.error('Could not retrieve file from S3', { fileKey });
      throw new BadRequestError('Could not validate file');
    }

    // Get file buffer
    const buffer = await response.Body.transformToByteArray();
    const fileBuffer = Buffer.from(buffer);

    // Detect actual file type from magic bytes
    const detectedType = await fileTypeFromBuffer(fileBuffer);

    if (!detectedType) {
      logger.warn('Could not detect file type from magic bytes', {
        fileName,
        fileKey,
        declaredMimeType
      });

      // Delete file from S3
      await s3.deleteObject({
        Bucket: config.s3.bucket,
        Key: fileKey
      });

      throw new BadRequestError('Unable to determine file type from content');
    }

    logger.debug('File type detected', {
      fileName,
      fileKey,
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
        fileKey,
        declaredMimeType,
        detectedMimeType: detectedType.mime
      });

      // Delete file from S3
      await s3.deleteObject({
        Bucket: config.s3.bucket,
        Key: fileKey
      });

      throw new BadRequestError(`File type ${detectedType.mime} is not allowed`);
    }

    // Verify that declared MIME matches detected MIME
    const [typeName, typeConfig] = allowedType;
    if (!typeConfig.mimeTypes.includes(declaredMimeType)) {
      logger.warn('MIME type mismatch detected (possible spoofing)', {
        fileName,
        fileKey,
        declaredMimeType,
        detectedMimeType: detectedType.mime,
        action: 'rejected'
      });

      // Delete file from S3
      await s3.deleteObject({
        Bucket: config.s3.bucket,
        Key: fileKey
      });

      throw new BadRequestError(
        `Declared MIME type (${declaredMimeType}) does not match actual file type (${detectedType.mime})`
      );
    }

    logger.info('File type validation successful', {
      fileName,
      fileKey,
      fileType: typeName,
      mimeType: detectedType.mime
    });

    next();
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      logger.error('Unexpected error in file type validation', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(new BadRequestError('Internal server error during file validation'));
    }
  }
};

export default validateUploadedFileType;
