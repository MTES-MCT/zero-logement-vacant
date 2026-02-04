import { PutObjectCommand } from '@aws-sdk/client-s3';
import { createS3 } from '@zerologementvacant/utils/node';
import { Array, pipe, Predicate } from 'effect';
import { fileTypeFromBuffer } from 'file-type';
import mime from 'mime';

import { FileValidationError } from '~/errors/fileValidationError';
import { isClamAVAvailable, scanBuffer } from '~/infra/clamav';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';

const logger = createLogger('document-upload');
const s3 = createS3({
  endpoint: config.s3.endpoint,
  region: config.s3.region,
  accessKeyId: config.s3.accessKeyId,
  secretAccessKey: config.s3.secretAccessKey
});

export interface UploadOptions {
  key: string;
}

export async function upload(
  file: Express.Multer.File,
  options: UploadOptions
): Promise<void> {
  try {
    const command = new PutObjectCommand({
      Bucket: config.s3.bucket,
      Key: options.key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ACL: 'authenticated-read',
      Metadata: {
        originalName: file.originalname,
        fieldName: file.fieldname
      }
    });
    await s3.send(command);
    logger.debug('File uploaded to S3', {
      filename: file.originalname,
      size: file.size,
      key: options.key
    });
  } catch (error) {
    logger.error('Failed to upload file to S3', {
      key: options.key,
      originalName: file.originalname,
      error: error instanceof Error ? error.message : String(error)
    });
    throw new FileValidationError(
      file.originalname,
      'upload_failed',
      'Failed to upload file to storage',
      { file }
    );
  }
}

export interface ValidateOptions {
  /**
   * Accepted file extensions (without dot).
   * @example ['png', 'jpg', 'pdf']
   * @default ['png', 'jpg', 'pdf']
   */
  accept?: ReadonlyArray<string>;
  /**
   * Maximum allowed file size in bytes.
   * @example 5 * 1024 * 1024 // 5MB
   * @default 25 * 1024 * 1024 // 25MB
   */
  maxSize?: number;
}

export async function validate(
  file: Express.Multer.File,
  options?: ValidateOptions
): Promise<void> {
  const declaredMimeType = file.mimetype;
  const fileName = file.originalname;
  const fileBuffer = file.buffer;

  const accept = options?.accept ?? ['png', 'jpg', 'pdf'];
  const maxSize = options?.maxSize ?? 25 * 1024 * 1024;

  // Validate file size
  if (file.size > maxSize) {
    logger.warn('File size exceeds maximum allowed', {
      fileName,
      size: file.size,
      maxSize
    });
    throw new FileValidationError(
      fileName,
      'file_too_large',
      `File size ${file.size} bytes exceeds maximum allowed size of ${maxSize} bytes`,
      {
        size: file.size,
        maxSize
      }
    );
  }

  logger.debug('Validating file type from memory buffer', {
    fileName,
    declaredMimeType,
    size: file.size
  });

  // Detect actual file type from magic bytes
  const detectedType = await fileTypeFromBuffer(fileBuffer);
  if (!detectedType) {
    logger.warn('Could not detect file type from magic bytes', {
      fileName,
      declaredMimeType
    });
    throw new FileValidationError(
      fileName,
      'invalid_file_type',
      'Could not detect file type from file content'
    );
  }

  logger.debug('File type detected', {
    fileName,
    declaredMimeType,
    detectedMimeType: detectedType.mime,
    detectedExtension: detectedType.ext
  });

  // Check if detected type is allowed
  const allowedFileTypes = pipe(
    accept,
    Array.map((ext) => mime.getType(ext)),
    Array.filter(Predicate.isNotNull),
    (types) => new Set(types)
  );
  if (!allowedFileTypes.has(detectedType.mime)) {
    logger.warn('Detected file type is not allowed', {
      fileName,
      declaredMimeType,
      detectedMimeType: detectedType.mime
    });
    throw new FileValidationError(
      fileName,
      'invalid_file_type',
      `File type ${detectedType.mime} is not allowed`,
      {
        detectedMimeType: detectedType.mime,
        allowedTypes: Array.fromIterable(allowedFileTypes)
      }
    );
  }

  // Verify that declared MIME matches detected MIME
  if (declaredMimeType !== detectedType.mime) {
    logger.warn('MIME type mismatch detected (possible spoofing)', {
      fileName,
      declaredMimeType,
      detectedMimeType: detectedType.mime
    });
    throw new FileValidationError(
      fileName,
      'mime_mismatch',
      'Declared MIME type does not match actual file type',
      {
        declaredMimeType,
        detectedMimeType: detectedType.mime
      }
    );
  }

  logger.debug('File type validation successful', {
    fileName,
    mimeType: detectedType.mime
  });

  // Validate for viruses
  if (!config.clamav.enabled) {
    logger.debug('Antivirus scan disabled', {
      filename: fileName
    });
    return;
  }

  // Check if ClamAV is available
  const isAvailable = await isClamAVAvailable();
  if (!isAvailable) {
    logger.error('ClamAV is not available', {
      filename: fileName
    });

    // In production, fail validation if ClamAV is not available
    if (config.app.env === 'production') {
      throw new FileValidationError(
        fileName,
        'virus_detected',
        'Antivirus service unavailable',
        { service: 'ClamAV', available: false }
      );
    }

    // In development, log warning and continue
    logger.warn('ClamAV unavailable - skipping scan (development mode)');
    return;
  }

  const startTime = Date.now();

  logger.info('Scanning file for viruses', {
    fileName,
    size: file.size,
    mimeType: file.mimetype,
    action: 'scan.started'
  });

  try {
    // Scan the file buffer
    const scanResult = await scanBuffer(fileBuffer, fileName);
    const duration = Date.now() - startTime;

    if (scanResult.isInfected) {
      logger.error('Virus detected in uploaded file', {
        fileName,
        size: file.size,
        mimeType: file.mimetype,
        virusName: scanResult.viruses.join(', '),
        viruses: scanResult.viruses,
        duration,
        action: 'virus_detected'
      });

      throw new FileValidationError(
        fileName,
        'virus_detected',
        `The uploaded file "${fileName}" contains malicious content and has been rejected`,
        {
          viruses: scanResult.viruses
        }
      );
    }

    logger.info('File passed virus scan', {
      fileName,
      size: file.size,
      mimeType: file.mimetype,
      duration,
      action: 'scan.completed'
    });
  } catch (error) {
    if (error instanceof FileValidationError) {
      throw error;
    }
    logger.error('Error during virus scan', {
      fileName,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}
