import { Request, Response, NextFunction, RequestHandler } from 'express';
import { logger } from '~/infra/logger';
import BadRequestError from '~/errors/badRequestError';
import AdmZip from 'adm-zip';
import shapefile from 'shapefile';

/**
 * Custom error class for shapefile validation failures
 */
class ShapefileValidationError extends BadRequestError {
  constructor(
    public readonly reason: 'missing_components' | 'too_many_features' | 'invalid_shapefile',
    public readonly fileName: string,
    public readonly details?: string
  ) {
    super();
    this.name = 'ShapefileValidationError';
  }
}

/**
 * Validates shapefile feature count
 *
 * Environment variables:
 * - MAX_SHAPEFILE_FEATURES: Maximum number of features allowed (default: 10000)
 *
 * This middleware extracts and validates the shapefile from ZIP to ensure:
 * 1. ZIP contains valid shapefile components (.shp, .shx, .dbf)
 * 2. Feature count is below the configured limit
 *
 * @example
 * ```typescript
 * router.post('/geo/perimeters',
 *   uploadGeo(),
 *   zipValidationMiddleware,
 *   antivirusMiddleware,
 *   shapefileValidationMiddleware, // this middleware
 *   geoController.createGeoPerimeter
 * );
 * ```
 */
export const shapefileValidationMiddleware: RequestHandler = async (
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

    const fileName = file.originalname;
    const fileBuffer = file.buffer;
    const startTime = Date.now();

    // Get max features from env or default to 10000
    const maxFeatures = parseInt(process.env.MAX_SHAPEFILE_FEATURES || '10000', 10);

    logger.info('Validating shapefile feature count', {
      fileName,
      size: file.size,
      maxFeatures,
      action: 'shapefile_validation.started'
    });

    try {
      // Extract ZIP to find shapefile components
      const zip = new AdmZip(fileBuffer);
      const zipEntries = zip.getEntries();

      // Find .shp and .dbf files
      const shpEntry = zipEntries.find((entry: any) => entry.entryName.toLowerCase().endsWith('.shp'));
      const dbfEntry = zipEntries.find((entry: any) => entry.entryName.toLowerCase().endsWith('.dbf'));

      if (!shpEntry || !dbfEntry) {
        const missing = [];
        if (!shpEntry) missing.push('.shp');
        if (!dbfEntry) missing.push('.dbf');

        logger.warn('Missing required shapefile components', {
          fileName,
          missing
        });

        throw new ShapefileValidationError(
          'missing_components',
          fileName,
          `Missing required files: ${missing.join(', ')}`
        );
      }

      logger.debug('Shapefile components found', {
        fileName,
        shpFile: shpEntry.entryName,
        dbfFile: dbfEntry.entryName
      });

      // Extract shapefile data
      const shpBuffer = shpEntry.getData();
      const dbfBuffer = dbfEntry.getData();

      // Count features using shapefile library
      let featureCount = 0;
      const source = await shapefile.open(shpBuffer, dbfBuffer);

      let result = await source.read();
      while (!result.done) {
        featureCount++;

        // Early exit if limit exceeded
        if (featureCount > maxFeatures) {
          logger.warn('Shapefile exceeds feature limit', {
            fileName,
            featureCount: `>${maxFeatures}`,
            maxFeatures
          });
          throw new ShapefileValidationError(
            'too_many_features',
            fileName,
            `Shapefile contains more than ${maxFeatures} features`
          );
        }

        result = await source.read();
      }

      const duration = Date.now() - startTime;

      logger.info('Shapefile validation successful', {
        fileName,
        featureCount,
        duration,
        action: 'shapefile_validation.completed',
        maxFeatures
      });

      // Store feature count in request for later use
      (req as any).shapefileFeatureCount = featureCount;

      next();
    } catch (error) {
      if (error instanceof ShapefileValidationError) {
        throw error;
      }

      if (error instanceof BadRequestError) {
        throw error;
      }

      logger.error('Error validating shapefile', {
        fileName,
        error: error instanceof Error ? error.message : String(error)
      });

      throw new ShapefileValidationError(
        'invalid_shapefile',
        fileName,
        error instanceof Error ? error.message : 'Invalid shapefile format'
      );
    }
  } catch (error) {
    if (error instanceof BadRequestError) {
      next(error);
    } else {
      logger.error('Unexpected error in shapefile validation', {
        error: error instanceof Error ? error.message : String(error)
      });
      next(new BadRequestError());
    }
  }
};

export default shapefileValidationMiddleware;
