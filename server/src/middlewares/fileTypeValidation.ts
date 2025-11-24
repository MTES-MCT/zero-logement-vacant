import { Request, Response, NextFunction, RequestHandler } from 'express';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { fileTypeFromBuffer } from 'file-type';
import { logger } from '~/infra/logger';
import BadRequestError from '~/errors/badRequestError';
import config from '~/infra/config';
import { createS3 } from '@zerologementvacant/utils/node';

// Ensure multer-s3 types are available
import 'multer-s3';

/**
 * Custom error class for file validation failures
 */
class FileValidationError extends BadRequestError {
  constructor(
    public readonly reason: 'invalid_file_type' | 'mime_mismatch',
    public readonly fileName: string,
    public readonly detectedType?: string
  ) {
    super();
    this.name = 'FileValidationError';
  }
}

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
    const userId = req.user?.id;

    logger.info('Validating uploaded file type', {
      fileName,
      fileKey,
      declaredMimeType,
      size: file.size,
      userId
    });

    // Download file from S3 to validate magic bytes
    const s3 = createS3({
      endpoint: config.s3.endpoint,
      region: config.s3.region,
      accessKeyId: config.s3.accessKeyId,
      secretAccessKey: config.s3.secretAccessKey
    });

    const response = await s3.send(new GetObjectCommand({
      Bucket: config.s3.bucket,
      Key: fileKey
    }));

    if (!response.Body) {
      logger.error('Could not retrieve file from S3', { fileKey, userId });
      throw new BadRequestError();
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
        declaredMimeType,
        userId
      });

      // Delete file from S3
      await s3.send(new DeleteObjectCommand({
        Bucket: config.s3.bucket,
        Key: fileKey
      }));

      throw new FileValidationError('invalid_file_type', fileName);
    }

    logger.debug('File type detected', {
      fileName,
      fileKey,
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
        fileKey,
        declaredMimeType,
        detectedMimeType: detectedType.mime,
        userId
      });

      // Delete file from S3
      await s3.send(new DeleteObjectCommand({
        Bucket: config.s3.bucket,
        Key: fileKey
      }));

      throw new FileValidationError('invalid_file_type', fileName, detectedType.mime);
    }

    // Verify that declared MIME matches detected MIME
    const [typeName, typeConfig] = allowedType;
    if (!typeConfig.mimeTypes.includes(declaredMimeType)) {
      logger.warn('MIME type mismatch detected (possible spoofing)', {
        fileName,
        fileKey,
        declaredMimeType,
        detectedMimeType: detectedType.mime,
        userId,
        action: 'rejected'
      });

      // Delete file from S3
      await s3.send(new DeleteObjectCommand({
        Bucket: config.s3.bucket,
        Key: fileKey
      }));

      throw new FileValidationError('mime_mismatch', fileName, detectedType.mime);
    }

    logger.info('File type validation successful', {
      fileName,
      fileKey,
      fileType: typeName,
      mimeType: detectedType.mime,
      userId
    });

    next();
  } catch (error) {
    if (error instanceof FileValidationError) {
      // Pass to error handler with reason
      next(error);
    } else if (error instanceof BadRequestError) {
      next(error);
    } else {
      logger.error('Unexpected error in file type validation', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(new BadRequestError());
    }
  }
};

export default validateUploadedFileType;
