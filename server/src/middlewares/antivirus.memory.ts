import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '~/infra/logger';
import { scanBuffer, isClamAVAvailable } from '~/infra/clamav';
import VirusDetectedError from '~/errors/virusDetectedError';
import { constants } from 'http2';
import config from '~/infra/config';

/**
 * Antivirus middleware for scanning uploaded files from memory
 *
 * This middleware should be placed AFTER the file upload and file type validation middlewares
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
 *   upload(), // multer middleware with memoryStorage
 *   fileTypeMiddleware, // file type validation
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
    const file = req.file;

    // Skip if no file uploaded
    if (!file) {
      next();
      return;
    }

    // Skip antivirus scan if disabled via config
    if (!config.clamav.enabled) {
      logger.info('Antivirus scan disabled (CLAMAV_ENABLED=false)', {
        filename: file.originalname
      });
      next();
      return;
    }

    // Skip antivirus scan in local development if configured (legacy support)
    if (process.env.SKIP_ANTIVIRUS_SCAN === 'true') {
      logger.warn('Antivirus scan skipped (SKIP_ANTIVIRUS_SCAN=true)', {
        filename: file.originalname,
        environment: process.env.NODE_ENV
      });
      next();
      return;
    }

    // Check if ClamAV is available
    const isAvailable = await isClamAVAvailable();
    if (!isAvailable) {
      logger.error('ClamAV is not available', {
        filename: file.originalname
      });

      // In production, fail the upload if ClamAV is not available
      if (process.env.NODE_ENV === 'production') {
        res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
          error: 'Antivirus service unavailable',
          reason: 'service_unavailable',
          message: 'The antivirus service is currently unavailable. Please try again later.',
          details: {
            service: 'ClamAV'
          }
        });
        return;
      }

      // In development, log warning and continue
      logger.warn('ClamAV unavailable - skipping scan (development mode)');
      next();
      return;
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

      // Throw virus detected error
      throw new VirusDetectedError(fileName, scanResult.viruses);
    }

    logger.info('File passed virus scan', {
      fileName,
      size: file.size,
      mimeType: file.mimetype,
      duration,
      action: 'scan.completed'
    });

    next();
  } catch (error) {
    if (error instanceof VirusDetectedError) {
      logger.error('Virus detected', {
        fileName: error.filename,
        virusName: error.viruses.join(', '),
        viruses: error.viruses,
        action: 'virus_detected'
      });

      res.status(error.status).json({
        error: 'Virus detected',
        reason: 'virus_detected',
        message: `The uploaded file "${error.filename}" contains malicious content and has been rejected.`,
        details: {
          filename: error.filename,
          viruses: error.viruses
        }
      });
    } else {
      logger.error('Error during antivirus scan', {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(constants.HTTP_STATUS_INTERNAL_SERVER_ERROR).json({
        error: 'Internal server error',
        reason: 'scan_error',
        message: 'An error occurred during virus scanning',
        details: {
          error: error instanceof Error ? error.message : String(error)
        }
      });
    }
  }
};

export default antivirusMiddleware;
