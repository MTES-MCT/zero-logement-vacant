import { Request, Response } from 'express';
import { param, query, validationResult } from 'express-validator';
import { constants } from 'http2';
import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { fileURLToPath } from 'url';

import { createLogger } from '~/infra/logger';
import createDatafoncierHousingRepository from '~/repositories/datafoncierHousingRepository';

const logger = createLogger('rnbController');

// Path to RNB CSV file (ES module compatible)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Navigate from controllers/ up to src/ and then to scripts/
const RNB_CSV_PATH = path.resolve(__dirname, '../scripts/import-rnb/RNB_44.csv');

// Lightweight building record (no shape stored - memory efficient)
interface RNBBuildingIndex {
  rnb_id: string;
  lon: number;
  lat: number;
  status: string;
  lineOffset: number; // Byte offset in file to read shape on demand
}

// Grid cell size (in degrees) for spatial indexing
const GRID_CELL_SIZE = 0.01; // ~1km

// Spatial index: Map<gridKey, RNBBuildingIndex[]>
let spatialIndex: Map<string, RNBBuildingIndex[]> | null = null;
let indexingInProgress = false;

function getGridKey(lon: number, lat: number): string {
  const gridX = Math.floor(lon / GRID_CELL_SIZE);
  const gridY = Math.floor(lat / GRID_CELL_SIZE);
  return `${gridX},${gridY}`;
}

function parsePointCoordinates(pointStr: string): [number, number] | null {
  // Remove quotes and SRID prefix if present
  const clean = pointStr.replace(/^"/, '').replace(/"$/, '').replace(/^SRID=\d+;/, '');
  const match = clean.match(/POINT\(([-\d.]+)\s+([-\d.]+)\)/);
  if (match) {
    return [parseFloat(match[1]), parseFloat(match[2])];
  }
  return null;
}

// Parse CSV line with quoted fields containing semicolons
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ';' && !inQuotes) {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

function parseWktToGeoJson(shapeStr: string): object | null {
  // Remove quotes and SRID prefix
  const clean = shapeStr.replace(/^"/, '').replace(/"$/, '').replace(/^SRID=\d+;/, '');

  // Match MULTIPOLYGON content
  const match = clean.match(/MULTIPOLYGON\(\(\((.*)\)\)\)/s);
  if (!match) return null;

  // Split by ring separator "),(" to handle multiple rings
  const ringsStr = match[1];
  const rings: number[][][] = [];

  // Parse each ring
  const ringParts = ringsStr.split('),(');
  for (const ringStr of ringParts) {
    const coords: number[][] = [];

    // Split coordinates by comma, but only valid coordinate pairs
    for (const point of ringStr.split(',')) {
      const trimmed = point.trim();
      // Skip any residual parentheses
      if (trimmed.startsWith('(') || trimmed.startsWith(')')) continue;

      const parts = trimmed.split(/\s+/);
      if (parts.length >= 2) {
        const lon = parseFloat(parts[0]);
        const lat = parseFloat(parts[1]);
        if (!isNaN(lon) && !isNaN(lat)) {
          coords.push([lon, lat]);
        }
      }
    }

    if (coords.length > 0) {
      rings.push(coords);
    }
  }

  if (rings.length > 0) {
    // MultiPolygon structure: [polygon1, polygon2, ...]
    // Each polygon: [outer_ring, inner_ring1, inner_ring2, ...]
    // Each ring: [[lon, lat], [lon, lat], ...]
    return {
      type: 'MultiPolygon',
      coordinates: [rings]  // Single polygon with multiple rings
    };
  }
  return null;
}

// Read a specific line from the CSV file using byte offset
async function readLineAtOffset(offset: number): Promise<string | null> {
  return new Promise((resolve) => {
    const stream = fs.createReadStream(RNB_CSV_PATH, {
      start: offset,
      encoding: 'utf8'
    });

    let data = '';
    stream.on('data', (chunk) => {
      data += chunk;
      const newlineIdx = data.indexOf('\n');
      if (newlineIdx !== -1) {
        stream.destroy();
        resolve(data.substring(0, newlineIdx));
      }
    });
    stream.on('end', () => {
      resolve(data || null);
    });
    stream.on('error', () => {
      resolve(null);
    });
  });
}

async function buildSpatialIndex(): Promise<void> {
  if (spatialIndex || indexingInProgress) return;

  indexingInProgress = true;
  logger.info('Building RNB spatial index (lightweight)...');

  const startTime = Date.now();
  spatialIndex = new Map();

  try {
    const fileStream = fs.createReadStream(RNB_CSV_PATH);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    let currentOffset = 0;
    let lineNumber = 0;
    let indexedCount = 0;

    for await (const line of rl) {
      const lineOffset = currentOffset;
      currentOffset += Buffer.byteLength(line, 'utf8') + 1; // +1 for newline

      lineNumber++;

      // Skip header
      if (lineNumber === 1) continue;

      // Quick parse: only extract what we need for indexing
      // rnb_id;point;shape;status;...
      // We only need to parse up to status, not the full line
      const firstSemi = line.indexOf(';');
      if (firstSemi === -1) continue;

      const rnb_id = line.substring(0, firstSemi);

      // Find the point field (between first and second semicolon, respecting quotes)
      let inQuotes = false;
      let fieldStart = firstSemi + 1;
      let semiCount = 0;
      let pointEnd = -1;
      let statusStart = -1;
      let statusEnd = -1;

      for (let i = fieldStart; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ';' && !inQuotes) {
          semiCount++;
          if (semiCount === 1) {
            pointEnd = i;
          } else if (semiCount === 2) {
            statusStart = i + 1;
          } else if (semiCount === 3) {
            statusEnd = i;
            break;
          }
        }
      }

      if (pointEnd === -1 || statusStart === -1) continue;

      const pointStr = line.substring(fieldStart, pointEnd);
      const status = statusEnd > statusStart
        ? line.substring(statusStart, statusEnd)
        : line.substring(statusStart).split(';')[0];

      const coords = parsePointCoordinates(pointStr);
      if (!coords) continue;

      const [lon, lat] = coords;
      const gridKey = getGridKey(lon, lat);

      const building: RNBBuildingIndex = {
        rnb_id,
        lon,
        lat,
        status,
        lineOffset
      };

      if (!spatialIndex.has(gridKey)) {
        spatialIndex.set(gridKey, []);
      }
      spatialIndex.get(gridKey)!.push(building);
      indexedCount++;

      // Log progress every 100k
      if (indexedCount % 100000 === 0) {
        logger.info(`Indexed ${indexedCount} buildings...`);
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`RNB spatial index built: ${indexedCount} buildings in ${duration}ms`);
    logger.info(`Grid cells: ${spatialIndex.size}`);

  } catch (error) {
    logger.error('Failed to build spatial index', { error });
    spatialIndex = null;
  } finally {
    indexingInProgress = false;
  }
}

// Start indexing on module load
buildSpatialIndex();

const getBuildingsValidators = [
  query('minLon').isFloat().withMessage('minLon must be a number'),
  query('maxLon').isFloat().withMessage('maxLon must be a number'),
  query('minLat').isFloat().withMessage('minLat must be a number'),
  query('maxLat').isFloat().withMessage('maxLat must be a number'),
  query('limit').optional().isInt({ min: 1, max: 10000 }).withMessage('limit must be 1-10000')
];

async function getBuildings(request: Request, response: Response) {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({
      errors: errors.array()
    });
  }

  const minLon = parseFloat(request.query.minLon as string);
  const maxLon = parseFloat(request.query.maxLon as string);
  const minLat = parseFloat(request.query.minLat as string);
  const maxLat = parseFloat(request.query.maxLat as string);
  const limit = parseInt(request.query.limit as string) || 5000;

  // Validate bounding box size (prevent too large requests)
  const lonRange = maxLon - minLon;
  const latRange = maxLat - minLat;

  if (lonRange > 0.5 || latRange > 0.5) {
    return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({
      error: 'Bounding box too large. Max 0.5 degrees (~50km)'
    });
  }

  if (!spatialIndex) {
    return response.status(constants.HTTP_STATUS_SERVICE_UNAVAILABLE).json({
      error: 'Spatial index not ready. Please retry in a moment.'
    });
  }

  logger.debug('Fetching RNB buildings', { minLon, maxLon, minLat, maxLat, limit });

  // Find all grid cells that intersect the bounding box
  const minGridX = Math.floor(minLon / GRID_CELL_SIZE);
  const maxGridX = Math.floor(maxLon / GRID_CELL_SIZE);
  const minGridY = Math.floor(minLat / GRID_CELL_SIZE);
  const maxGridY = Math.floor(maxLat / GRID_CELL_SIZE);

  // Collect matching buildings
  const matchingBuildings: RNBBuildingIndex[] = [];

  for (let gx = minGridX; gx <= maxGridX; gx++) {
    for (let gy = minGridY; gy <= maxGridY; gy++) {
      const gridKey = `${gx},${gy}`;
      const buildings = spatialIndex.get(gridKey);

      if (!buildings) continue;

      for (const building of buildings) {
        // Check if building is within bounding box
        if (building.lon >= minLon && building.lon <= maxLon &&
            building.lat >= minLat && building.lat <= maxLat) {
          matchingBuildings.push(building);
          if (matchingBuildings.length >= limit) break;
        }
      }
      if (matchingBuildings.length >= limit) break;
    }
    if (matchingBuildings.length >= limit) break;
  }

  // Read shapes from file for matching buildings (in parallel batches)
  const features: object[] = [];
  const batchSize = 100;

  for (let i = 0; i < matchingBuildings.length; i += batchSize) {
    const batch = matchingBuildings.slice(i, i + batchSize);
    const linePromises = batch.map(b => readLineAtOffset(b.lineOffset));
    const lines = await Promise.all(linePromises);

    for (let j = 0; j < batch.length; j++) {
      const building = batch[j];
      const line = lines[j];

      if (!line) continue;

      const parts = parseCSVLine(line);
      if (parts.length < 3) continue;

      const shapeStr = parts[2];
      const geometry = parseWktToGeoJson(shapeStr);

      if (geometry) {
        features.push({
          type: 'Feature',
          properties: {
            rnb_id: building.rnb_id,
            status: building.status
          },
          geometry
        });
      }
    }
  }

  const geojson = {
    type: 'FeatureCollection',
    features
  };

  logger.debug(`Returning ${features.length} RNB buildings`);

  response.status(constants.HTTP_STATUS_OK).json(geojson);
}

const datafoncierHousingRepository = createDatafoncierHousingRepository();

const getHousingByRnbIdValidators = [
  param('rnbId').isString().notEmpty().withMessage('rnbId is required')
];

async function getHousingByRnbId(request: Request, response: Response) {
  const errors = validationResult(request);
  if (!errors.isEmpty()) {
    return response.status(constants.HTTP_STATUS_BAD_REQUEST).json({
      errors: errors.array()
    });
  }

  const { rnbId } = request.params;

  logger.debug('Looking up housing by rnb_id', { rnbId });

  const housings = await datafoncierHousingRepository.find({ rnb_id: rnbId });

  if (housings.length === 0) {
    logger.debug('No housing found for rnb_id', { rnbId });
    return response.status(constants.HTTP_STATUS_NOT_FOUND).json({
      error: 'No housing found for this RNB building'
    });
  }

  logger.debug(`Found ${housings.length} housing(s) for rnb_id`, { rnbId });

  response.status(constants.HTTP_STATUS_OK).json(housings);
}

export default {
  getBuildingsValidators,
  getBuildings,
  getHousingByRnbIdValidators,
  getHousingByRnbId
};
