import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '~/infra/logger';
import { scanBuffer, isClamAVAvailable } from '~/infra/clamav';
import VirusDetectedError from '~/errors/virusDetectedError';
import { constants } from 'node:http2';
import config from '~/infra/config';

/**
 * Antivirus middleware for scanning uploaded files
 *
 * This middleware scans files kept in memory (req.file.buffer) using ClamAV.
 * It works with multer memory storage and scans the buffer directly.
 *
 * This middleware should be placed AFTER the file upload and file type validation middlewares.
 *
 * Environment variables:
 * - CLAMAV_ENABLED: Set to 'true' to enable virus scanning (default: false)
 * - CLAMAV_HOST: ClamAV daemon host (default: 127.0.0.1)
 * - CLAMAV_PORT: ClamAV daemon port (default: 3310)
 * - CLAMAV_SOCKET: ClamAV socket path (default: /var/run/clamav/clamd.sock)
 *
 * @example
 * ```typescript
 * const upload = multer({ storage: multer.memoryStorage() });
 * router.post('/files',
 *   upload.single('file'),
 *   fileTypeMiddleware,
 *   antivirusMiddleware,
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

    // Skip if ClamAV is disabled
    if (!config.clamav.enabled) {
      logger.info('Antivirus scan disabled', {
        filename: file.originalname
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
      if (config.app.env === 'production') {
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
    const userId = req.user?.id;
    const startTime = Date.now();

    logger.info('Scanning file for viruses', {
      fileName,
      size: file.size,
      mimeType: file.mimetype,
      userId,
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
        userId,
        duration,
        action: 'virus_detected'
      });

      throw new VirusDetectedError(fileName, scanResult.viruses);
    }

    logger.info('File passed virus scan', {
      fileName,
      size: file.size,
      mimeType: file.mimetype,
      userId,
      duration,
      action: 'scan.completed'
    });

    next();
  } catch (error) {
    // Let the error handler deal with it
    next(error);
  }
};

export default antivirusMiddleware;
