import { Request, Response, NextFunction, RequestHandler } from 'express';
import { GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { logger } from '~/infra/logger';
import { scanBuffer, isClamAVAvailable } from '~/infra/clamav';
import VirusDetectedError from '~/errors/virusDetectedError';
import config from '~/infra/config';
import { createS3 } from '@zerologementvacant/utils/node';
import { constants } from 'http2';

// Ensure multer-s3 types are available
import 'multer-s3';

/**
 * Antivirus middleware for scanning uploaded files
 *
 * This middleware should be placed AFTER the file upload middleware
 * to scan uploaded files for viruses using ClamAV.
 *
 * Environment variables:
 * - CLAMAV_ENABLED: Set to 'true' to enable virus scanning (default: false)
 * - SKIP_ANTIVIRUS_SCAN: Set to 'true' to skip virus scanning (legacy, deprecated)
 * - CLAMAV_HOST: ClamAV daemon host (default: 127.0.0.1)
 * - CLAMAV_PORT: ClamAV daemon port (default: 3310)
 * - CLAMAV_SOCKET: ClamAV socket path (default: /var/run/clamav/clamd.sock)
 *
 * @example
 * ```typescript
 * router.post('/files',
 *   upload(), // multer middleware
 *   validateUploadedFileType, // file type validation
 *   antivirusMiddleware, // this middleware
 *   fileController.create
 * );
 * ```
 */
export const antivirusMiddleware: RequestHandler = async (
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

    // Skip antivirus scan if disabled via config
    if (!config.clamav.enabled) {
      logger.info('Antivirus scan disabled (CLAMAV_ENABLED=false)', {
        filename: file.originalname,
        fileKey: file.key
      });
      next();
      return;
    }

    // Skip antivirus scan in local development if configured (legacy support)
    if (process.env.SKIP_ANTIVIRUS_SCAN === 'true') {
      logger.warn('Antivirus scan skipped (SKIP_ANTIVIRUS_SCAN=true)', {
        filename: file.originalname,
        fileKey: file.key,
        environment: process.env.NODE_ENV
      });
      next();
      return;
    }

    // Check if ClamAV is available
    const isAvailable = await isClamAVAvailable();
    if (!isAvailable) {
      logger.error('ClamAV is not available', {
        filename: file.originalname,
        fileKey: file.key
      });

      // In production, fail the upload if ClamAV is not available
      if (process.env.NODE_ENV === 'production') {
        res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
          error: 'Antivirus service unavailable',
          message: 'The antivirus service is currently unavailable. Please try again later.'
        });
        return;
      }

      // In development, log warning and continue
      logger.warn('ClamAV unavailable - skipping scan (development mode)');
      next();
      return;
    }

    const fileName = file.originalname;
    const fileKey = file.key;

    logger.info('Scanning file for viruses', {
      filename: fileName,
      fileKey,
      size: file.size
    });

    // Download file from S3 to scan
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
      logger.error('Could not retrieve file from S3 for scanning', {
        fileKey,
        filename: fileName
      });
      res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        message: 'Could not scan file'
      });
      return;
    }

    // Get file buffer
    const buffer = await response.Body.transformToByteArray();
    const fileBuffer = Buffer.from(buffer);

    // Scan the file
    const scanResult = await scanBuffer(fileBuffer, fileName);

    if (scanResult.isInfected) {
      logger.error('Virus detected in uploaded file', {
        filename: fileName,
        fileKey,
        viruses: scanResult.viruses,
        size: file.size,
        action: 'virus_detected'
      });

      // Delete infected file from S3
      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: config.s3.bucket,
          Key: fileKey
        }));
        logger.info('Infected file deleted from S3', {
          fileKey,
          filename: fileName
        });
      } catch (deleteError) {
        logger.error('Failed to delete infected file from S3', {
          fileKey,
          filename: fileName,
          error: deleteError instanceof Error ? deleteError.message : String(deleteError)
        });
      }

      // Throw virus detected error
      throw new VirusDetectedError(fileName, scanResult.viruses);
    }

    logger.info('File passed virus scan', {
      filename: fileName,
      fileKey,
      size: file.size,
      action: 'scan.completed'
    });

    next();
  } catch (error) {
    if (error instanceof VirusDetectedError) {
      logger.error('Virus detected', {
        filename: error.filename,
        viruses: error.viruses,
        action: 'virus_detected'
      });

      res.status(error.status).json({
        error: 'Virus detected',
        message: error.message,
        filename: error.filename,
        viruses: error.viruses
      });
    } else {
      logger.error('Error during antivirus scan', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        message: 'Error occurred during virus scanning'
      });
    }
  }
};

export default antivirusMiddleware;
