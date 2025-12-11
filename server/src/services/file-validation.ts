import async from 'async';
import { Array, pipe, Predicate, Either } from 'effect';
import { fileTypeFromBuffer } from 'file-type';
import mime from 'mime';

import { FileValidationError } from '~/errors/fileValidationError';
import { isClamAVAvailable, scanBuffer } from '~/infra/clamav';
import config from '~/infra/config';
import { logger } from '~/infra/logger';

/**
 * A set of allowed MIME types
 */
const ALLOWED_FILE_TYPES: Set<string> = pipe(
  ['png', 'jpg', 'pdf'] as const,
  Array.map((ext) => mime.getType(ext)),
  Array.filter(Predicate.isNotNull),
  (types) => new Set(types)
);

interface FileTypeOptions {
  /**
   * Accepted file extensions (without dot).
   * @example ['png', 'jpg', 'pdf']
   */
  accept?: string[];
}

/**
 * Validates file type for a single file using magic bytes
 *
 * @param file - File to validate
 * @returns FileValidationError if validation fails, null otherwise
 */
async function validateFileType(
  file: Express.Multer.File,
  options?: FileTypeOptions
): Promise<FileValidationError | null> {
  const declaredMimeType = file.mimetype;
  const fileName = file.originalname;
  const fileBuffer = file.buffer;

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
    return new FileValidationError(
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
    options?.accept ?? ['png', 'jpg', 'pdf'],
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
    return new FileValidationError(
      fileName,
      'invalid_file_type',
      `File type ${detectedType.mime} is not allowed`,
      {
        detectedMimeType: detectedType.mime,
        allowedTypes: Array.fromIterable(ALLOWED_FILE_TYPES)
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
    return new FileValidationError(
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

  return null;
}

/**
 * Validates file for viruses using ClamAV
 *
 * @param file - File to validate
 * @returns FileValidationError if virus detected, null otherwise
 */
async function validateFileVirus(
  file: Express.Multer.File
): Promise<FileValidationError | null> {
  // Skip if ClamAV is disabled
  if (!config.clamav.enabled) {
    logger.debug('Antivirus scan disabled', {
      filename: file.originalname
    });
    return null;
  }

  // Check if ClamAV is available
  const isAvailable = await isClamAVAvailable();
  if (!isAvailable) {
    logger.error('ClamAV is not available', {
      filename: file.originalname
    });

    // In production, fail validation if ClamAV is not available
    if (config.app.env === 'production') {
      return new FileValidationError(
        file.originalname,
        'virus_detected',
        'Antivirus service unavailable',
        { service: 'ClamAV', available: false }
      );
    }

    // In development, log warning and continue
    logger.warn('ClamAV unavailable - skipping scan (development mode)');
    return null;
  }

  const fileName = file.originalname;
  const fileBuffer = file.buffer;
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

      return new FileValidationError(
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

    return null;
  } catch (error) {
    logger.error('Error during virus scan', {
      fileName,
      error: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
}

export interface ValidateFilesOptions {
  /**
   * Accepted file extensions (without dot).
   * @example ['png', 'jpg', 'pdf']
   */
  accept?: string[];
}

/**
 * Validates multiple files, accumulating errors instead of throwing
 *
 * This function validates all files in parallel and returns an array of Either types,
 * where Left contains validation errors and Right contains valid files.
 *
 * Validation order for each file:
 * 1. File type validation (magic bytes)
 * 2. Virus scanning (if enabled and file type is valid)
 *
 * @param files - Array of files to validate
 * @returns ReadonlyArray of Either types - Left for errors, Right for valid files
 *
 * @example
 * ```typescript
 * const results = await validateFiles(files);
 * const [errors, valid] = Array.partition(results, Either.isRight);
 * ```
 */
export async function validateFiles(
  files: Express.Multer.File[],
  options?: ValidateFilesOptions
): Promise<
  ReadonlyArray<Either.Either<Express.Multer.File, FileValidationError>>
> {
  logger.info('Starting file validation', {
    count: files.length,
    action: 'validation.started'
  });

  const results = await async.map(
    files,
    async (
      file: Express.Multer.File
    ): Promise<Either.Either<Express.Multer.File, FileValidationError>> => {
      // Validate file type first
      const fileTypeError = await validateFileType(file, {
        accept: options?.accept
      });
      if (fileTypeError) {
        return Either.left(fileTypeError);
      }

      // Validate for viruses if file type is valid
      const virusError = await validateFileVirus(file);
      if (virusError) {
        return Either.left(virusError);
      }

      // File is valid
      return Either.right(file);
    }
  );

  const [validFiles, errors] = Array.partition(results, Either.isLeft);

  logger.info('File validation completed', {
    total: files.length,
    valid: validFiles.length,
    errors: errors.length,
    action: 'validation.completed'
  });

  return results;
}
