import * as turf from '@turf/turf';
import AdmZip from 'adm-zip';
import async from 'async';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from 'express-jwt';
import { body, param } from 'express-validator';
import {
  Feature,
  FeatureCollection,
  Geometry,
  MultiPolygon,
  Position
} from 'geojson';
import { constants } from 'http2';
import proj4 from 'proj4';
import shapefile from 'shapefile';
import { v4 as uuidv4 } from 'uuid';
import { match, Pattern } from 'ts-pattern';

import geoRepository from '~/repositories/geoRepository';
import { isArrayOf, isUUID } from '~/utils/validators';
import { logger } from '~/infra/logger';
import { GeoPerimeterApi, toGeoPerimeterDTO } from '~/models/GeoPerimeterApi';

// Common projections for French territories
const KNOWN_PROJECTIONS: Record<string, string> = {
  // Metropolitan France
  'EPSG:2154': '+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
  // Réunion (standard UTM zone 40S)
  'EPSG:2975': '+proj=utm +zone=40 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
  // Martinique
  'EPSG:5490': '+proj=utm +zone=20 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
  // Guadeloupe
  'EPSG:32620': '+proj=utm +zone=20 +datum=WGS84 +units=m +no_defs +type=crs',
  // Guyane
  'EPSG:2972': '+proj=utm +zone=22 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
  // Mayotte
  'EPSG:4471': '+proj=utm +zone=38 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
};

// Special projections with coordinate offsets (non-standard grids)
// Some shapefiles use modified coordinate systems with additional offsets
interface ProjectionWithOffset {
  proj4: string;
  xOffset: number;
  yOffset: number;
}

const OFFSET_PROJECTIONS: Record<string, ProjectionWithOffset> = {
  // Réunion with non-standard offsets (X+1.35M, Y+1.57M added to standard UTM 40S)
  // Detected from shapefiles with X: ~1.6M-1.9M, Y: ~9.0M-9.5M
  'REUNION_OFFSET': {
    proj4: '+proj=utm +zone=40 +south +datum=WGS84 +units=m +no_defs +type=crs',
    xOffset: -1350000,
    yOffset: -1570000
  }
};

// WGS84 definition
const WGS84 = '+proj=longlat +datum=WGS84 +no_defs +type=crs';

/**
 * Detect projection from coordinate ranges when .prj file is missing
 */
function detectProjectionFromCoordinates(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): string | null {
  // WGS84 - already in lat/lng
  if (xMin >= -180 && xMax <= 180 && yMin >= -90 && yMax <= 90) {
    return null; // No reprojection needed
  }

  // Lambert 93 (Metropolitan France)
  if (xMin > 100000 && xMax < 1300000 && yMin > 6000000 && yMax < 7200000) {
    return 'EPSG:2154';
  }

  // Réunion with non-standard offsets (some local tools add extra offsets)
  // Detected pattern: X ~1.6M-1.9M, Y ~9.0M-9.5M
  // This needs special handling with coordinate offsets before reprojection
  if (xMin > 1600000 && xMax < 1900000 && yMin > 9000000 && yMax < 9500000) {
    return 'REUNION_OFFSET';
  }

  // Standard UTM zone 40S (Réunion) - X around 300-500k, Y around 7.6-7.8M
  if (xMin > 300000 && xMax < 600000 && yMin > 7600000 && yMax < 7800000) {
    return 'EPSG:2975';
  }

  // UTM zone 20N (Martinique/Guadeloupe)
  if (xMin > 400000 && xMax < 800000 && yMin > 1600000 && yMax < 1900000) {
    return 'EPSG:5490';
  }

  // UTM zone 22N (Guyane)
  if (xMin > 100000 && xMax < 400000 && yMin > 200000 && yMax < 700000) {
    return 'EPSG:2972';
  }

  // UTM zone 38S (Mayotte)
  if (xMin > 400000 && xMax < 600000 && yMin > 8500000 && yMax < 8700000) {
    return 'EPSG:4471';
  }

  logger.warn('Unable to detect projection from coordinates', {
    xMin,
    xMax,
    yMin,
    yMax
  });
  return null;
}

/**
 * Parse WKT projection string to detect EPSG code
 */
function parseWktProjection(wkt: string): string | null {
  // Look for EPSG code in AUTHORITY
  const authorityMatch = wkt.match(/AUTHORITY\s*\[\s*"EPSG"\s*,\s*"(\d+)"\s*\]/i);
  if (authorityMatch) {
    return `EPSG:${authorityMatch[1]}`;
  }

  // Look for common projection names
  if (wkt.includes('Lambert_Conformal_Conic') && wkt.includes('RGF93')) {
    return 'EPSG:2154';
  }
  if (wkt.includes('UTM') && wkt.includes('zone 40S')) {
    return 'EPSG:2975';
  }
  if (wkt.includes('RGR92')) {
    return 'EPSG:2975';
  }

  return null;
}

/**
 * Reproject coordinates from source CRS to WGS84
 * Handles both standard EPSG projections and special offset projections
 */
function reprojectCoordinates(
  coordinates: Position[],
  sourceProj: string
): Position[] {
  // Check for offset projections first
  const offsetProj = OFFSET_PROJECTIONS[sourceProj];
  if (offsetProj) {
    return coordinates.map((coord) => {
      const [x, y, ...rest] = coord;
      // Apply coordinate offsets before reprojection
      const adjustedX = x + offsetProj.xOffset;
      const adjustedY = y + offsetProj.yOffset;
      const [lng, lat] = proj4(offsetProj.proj4, WGS84, [adjustedX, adjustedY]);
      return [lng, lat, ...rest];
    });
  }

  // Standard EPSG projection
  const projDef = KNOWN_PROJECTIONS[sourceProj];
  if (!projDef) {
    logger.warn('Unknown projection, cannot reproject', { sourceProj });
    return coordinates;
  }

  return coordinates.map((coord) => {
    const [x, y, ...rest] = coord;
    const [lng, lat] = proj4(projDef, WGS84, [x, y]);
    return [lng, lat, ...rest];
  });
}

/**
 * Recursively reproject all coordinates in a geometry
 * Handles both standard EPSG projections and special offset projections
 */
function reprojectGeometry(geometry: Geometry, sourceProj: string): Geometry {
  if (geometry.type === 'Point') {
    const [x, y] = geometry.coordinates as [number, number];

    // Check for offset projections first
    const offsetProj = OFFSET_PROJECTIONS[sourceProj];
    if (offsetProj) {
      const adjustedX = x + offsetProj.xOffset;
      const adjustedY = y + offsetProj.yOffset;
      const [lng, lat] = proj4(offsetProj.proj4, WGS84, [adjustedX, adjustedY]);
      return { ...geometry, coordinates: [lng, lat] };
    }

    // Standard EPSG projection
    const projDef = KNOWN_PROJECTIONS[sourceProj];
    if (projDef) {
      const [lng, lat] = proj4(projDef, WGS84, [x, y]);
      return { ...geometry, coordinates: [lng, lat] };
    }

    return geometry;
  }

  if (geometry.type === 'LineString' || geometry.type === 'MultiPoint') {
    return {
      ...geometry,
      coordinates: reprojectCoordinates(geometry.coordinates, sourceProj)
    };
  }

  if (geometry.type === 'Polygon' || geometry.type === 'MultiLineString') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((ring) =>
        reprojectCoordinates(ring, sourceProj)
      )
    };
  }

  if (geometry.type === 'MultiPolygon') {
    return {
      ...geometry,
      coordinates: geometry.coordinates.map((polygon) =>
        polygon.map((ring) => reprojectCoordinates(ring, sourceProj))
      )
    };
  }

  return geometry;
}

interface ParsedShapefile {
  featureCollection: FeatureCollection;
  sourceProjection: string | null;
}

/**
 * Parse a shapefile from a ZIP buffer using the shapefile library.
 * This correctly handles Null Shapes (type 0) which shpjs cannot parse.
 * Also detects the source projection for reprojection to WGS84.
 */
async function parseShapefileFromZip(
  fileBuffer: Buffer
): Promise<ParsedShapefile> {
  const zip = new AdmZip(fileBuffer);
  const zipEntries = zip.getEntries();

  const shpEntry = zipEntries.find((entry) =>
    entry.entryName.toLowerCase().endsWith('.shp')
  );
  const dbfEntry = zipEntries.find((entry) =>
    entry.entryName.toLowerCase().endsWith('.dbf')
  );
  const prjEntry = zipEntries.find((entry) =>
    entry.entryName.toLowerCase().endsWith('.prj')
  );

  if (!shpEntry || !dbfEntry) {
    throw new Error('Missing required shapefile components (.shp and .dbf)');
  }

  const shpBuffer = shpEntry.getData();
  const dbfBuffer = dbfEntry.getData();

  // Try to detect projection from .prj file
  let sourceProjection: string | null = null;
  if (prjEntry) {
    const prjContent = prjEntry.getData().toString('utf-8');
    sourceProjection = parseWktProjection(prjContent);
    if (sourceProjection) {
      logger.info('Detected projection from .prj file', { sourceProjection });
    }
  }

  const features: Feature[] = [];
  const source = await shapefile.open(shpBuffer, dbfBuffer);

  // Track coordinate bounds for projection detection
  let xMin = Infinity;
  let xMax = -Infinity;
  let yMin = Infinity;
  let yMax = -Infinity;

  let result = await source.read();
  while (!result.done) {
    const feature = result.value;
    // Filter out Null Shapes (features with null geometry)
    if (feature.geometry !== null) {
      features.push(feature as Feature);

      // Update bounds from coordinates (skip GeometryCollection)
      if (feature.geometry.type !== 'GeometryCollection') {
        const coords = JSON.stringify(feature.geometry.coordinates);
        const numbers = coords.match(/-?\d+\.?\d*/g)?.map(Number) || [];
        for (let i = 0; i < numbers.length; i += 2) {
          const x = numbers[i];
          const y = numbers[i + 1];
          if (x !== undefined && y !== undefined) {
            xMin = Math.min(xMin, x);
            xMax = Math.max(xMax, x);
            yMin = Math.min(yMin, y);
            yMax = Math.max(yMax, y);
          }
        }
      }
    }
    result = await source.read();
  }

  // If no projection detected from .prj, try to detect from coordinates
  if (!sourceProjection && features.length > 0) {
    sourceProjection = detectProjectionFromCoordinates(xMin, xMax, yMin, yMax);
    if (sourceProjection) {
      logger.info('Detected projection from coordinate ranges', {
        sourceProjection,
        bounds: { xMin, xMax, yMin, yMax }
      });
    }
  }

  return {
    featureCollection: {
      type: 'FeatureCollection',
      features
    },
    sourceProjection
  };
}

async function listGeoPerimeters(request: Request, response: Response) {
  const { auth } = request as AuthenticatedRequest;

  logger.info('List geo perimeters', auth.establishmentId);

  const geoPerimeters = await geoRepository.find(auth.establishmentId);
  response.status(constants.HTTP_STATUS_OK).json(geoPerimeters);
}

async function createGeoPerimeter(
  request: Request,
  response: Response
) {
  const { establishmentId, userId } = (request as AuthenticatedRequest).auth;
  const file = request.file;

  if (!file) {
    return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({
      error: 'No file uploaded',
      message: 'Please upload a shapefile as a ZIP file'
    });
  }

  logger.info('Create geo perimeter', {
    establishment: establishmentId,
    name: file.originalname
  });

  const { featureCollection, sourceProjection } = await parseShapefileFromZip(
    file.buffer
  );

  // Log reprojection info
  if (sourceProjection) {
    logger.info('Reprojecting shapefile coordinates to WGS84', {
      sourceProjection,
      featureCount: featureCollection.features.length
    });
  }

  const features = featureCollection.features;
  const perimeters = await async.map(features, async (feature: Feature) => {
    // Reproject geometry if source projection was detected
    let geometry = feature.geometry;
    const hasKnownProjection = sourceProjection && KNOWN_PROJECTIONS[sourceProjection];
    const hasOffsetProjection = sourceProjection && OFFSET_PROJECTIONS[sourceProjection];
    if (hasKnownProjection || hasOffsetProjection) {
      geometry = reprojectGeometry(geometry, sourceProjection);
    }

    // TODO: ask if it necessary to create one perimeter by feature
    const multiPolygon: MultiPolygon = to2D(toMultiPolygon(geometry));
    const perimeter: GeoPerimeterApi = {
      id: uuidv4(),
      kind: feature.properties?.type ?? '',
      name: feature.properties?.nom ?? '',
      geometry: multiPolygon,
      establishmentId,
      createdAt: new Date().toJSON(),
      createdBy: userId
    };
    await geoRepository.save(perimeter);
    return perimeter;
  });

  response
    .status(constants.HTTP_STATUS_OK)
    .json(perimeters.map(toGeoPerimeterDTO));
}

// TODO: export this to the `utils` package
export function toMultiPolygon(geometry: Geometry): MultiPolygon {
  return match(geometry)
    .with({ type: 'MultiPolygon' }, (multiPolygon) => multiPolygon)
    .with({ type: 'Polygon' }, (polygon) => {
      return turf.multiPolygon([polygon.coordinates]).geometry;
    })
    .with(
      { type: Pattern.union('LineString', 'MultiLineString') },
      (lineString) => {
        const polygons = turf
          .polygonize(lineString)
          .features.map(turf.getGeom)
          .map((polygon) => polygon.coordinates);
        return turf.multiPolygon(polygons).geometry;
      }
    )
    .otherwise((geometry) => {
      throw new Error(`${geometry.type} is not supported`);
    });
}

export function to2D(multiPolygon: MultiPolygon): MultiPolygon {
  const polygons = multiPolygon.coordinates.map((polygons) => {
    return polygons.map((polygon) => {
      return polygon.map((position) => position.slice(0, 2));
    });
  });
  return turf.multiPolygon(polygons).geometry;
}

const deleteGeoPerimeterListValidators = [
  body('geoPerimeterIds')
    .custom(isArrayOf(isUUID))
    .withMessage('Must be an array of UUIDs')
];

async function deleteGeoPerimeterList(request: Request, response: Response) {
  const { auth, body } = request as AuthenticatedRequest;

  logger.info('Delete geo perimeters', body.geoPerimeterIds);

  await geoRepository.removeMany(body.geoPerimeterIds, auth.establishmentId);

  response.status(constants.HTTP_STATUS_NO_CONTENT).send();
}

const updateGeoPerimeterValidators = [
  param('geoPerimeterId').notEmpty().isUUID(),
  body('kind').notEmpty().isString(),
  body('name').optional({ nullable: true }).isString()
];

async function updateGeoPerimeter(request: Request, response: Response) {
  const geoPerimeterId = request.params.geoPerimeterId;
  const establishmentId = (request as AuthenticatedRequest).auth
    .establishmentId;
  const kind = request.body.kind;
  const name = request.body.name;

  logger.info('Update geo perimeter', { geoPerimeterId, kind, name });

  const geoPerimeter = await geoRepository.get(geoPerimeterId);

  if (!geoPerimeter || geoPerimeter.establishmentId !== establishmentId) {
    return response.sendStatus(constants.HTTP_STATUS_UNAUTHORIZED);
  }

  const updated: GeoPerimeterApi = {
    ...geoPerimeter,
    kind,
    name
  };
  await geoRepository.update(updated);
  response.status(constants.HTTP_STATUS_OK).json(updated);
}

const geoController = {
  createGeoPerimeter,
  listGeoPerimeters,
  deleteGeoPerimeterListValidators,
  deleteGeoPerimeterList,
  updateGeoPerimeterValidators,
  updateGeoPerimeter
};

export default geoController;
