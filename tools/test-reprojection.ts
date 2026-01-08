/**
 * Script de test de la reprojection des coordonnées
 * Usage: npx tsx tools/test-reprojection.ts "tools/perimetre ACV.zip"
 */

import AdmZip from 'adm-zip';
import * as fs from 'fs';
import proj4 from 'proj4';
import * as shapefile from 'shapefile';
import { Feature, Geometry, Position } from 'geojson';

// Common projections for French territories
const KNOWN_PROJECTIONS: Record<string, string> = {
  'EPSG:2154': '+proj=lcc +lat_0=46.5 +lon_0=3 +lat_1=49 +lat_2=44 +x_0=700000 +y_0=6600000 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
  'EPSG:2975': '+proj=utm +zone=40 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
  'EPSG:5490': '+proj=utm +zone=20 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
  'EPSG:32620': '+proj=utm +zone=20 +datum=WGS84 +units=m +no_defs +type=crs',
  'EPSG:2972': '+proj=utm +zone=22 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs',
  'EPSG:4471': '+proj=utm +zone=38 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs +type=crs'
};

// Special projections with coordinate offsets
interface ProjectionWithOffset {
  proj4: string;
  xOffset: number;
  yOffset: number;
}

const OFFSET_PROJECTIONS: Record<string, ProjectionWithOffset> = {
  'REUNION_OFFSET': {
    proj4: '+proj=utm +zone=40 +south +datum=WGS84 +units=m +no_defs +type=crs',
    xOffset: -1350000,
    yOffset: -1570000
  }
};

const WGS84 = '+proj=longlat +datum=WGS84 +no_defs +type=crs';

// Known location bounding boxes
const KNOWN_LOCATIONS: Record<string, { minLng: number; maxLng: number; minLat: number; maxLat: number }> = {
  'Metropolitan France': { minLng: -5, maxLng: 10, minLat: 41, maxLat: 51 },
  'La Réunion': { minLng: 55.2, maxLng: 55.9, minLat: -21.5, maxLat: -20.8 },
  'Mayotte': { minLng: 45.0, maxLng: 45.3, minLat: -13.0, maxLat: -12.6 },
  'Guadeloupe': { minLng: -61.9, maxLng: -61.0, minLat: 15.8, maxLat: 16.5 },
  'Martinique': { minLng: -61.3, maxLng: -60.8, minLat: 14.4, maxLat: 14.9 },
  'Guyane': { minLng: -54.5, maxLng: -51.5, minLat: 2.0, maxLat: 6.0 },
};

function getLocationName(lng: number, lat: number): string | null {
  for (const [name, bounds] of Object.entries(KNOWN_LOCATIONS)) {
    if (lng >= bounds.minLng && lng <= bounds.maxLng &&
        lat >= bounds.minLat && lat <= bounds.maxLat) {
      return name;
    }
  }
  return null;
}

function detectProjectionFromCoordinates(
  xMin: number,
  xMax: number,
  yMin: number,
  yMax: number
): string | null {
  if (xMin >= -180 && xMax <= 180 && yMin >= -90 && yMax <= 90) {
    return null;
  }
  if (xMin > 100000 && xMax < 1300000 && yMin > 6000000 && yMax < 7200000) {
    return 'EPSG:2154';
  }
  // Réunion with non-standard offsets
  if (xMin > 1600000 && xMax < 1900000 && yMin > 9000000 && yMax < 9500000) {
    return 'REUNION_OFFSET';
  }
  // Standard UTM zone 40S (Réunion)
  if (xMin > 300000 && xMax < 600000 && yMin > 7600000 && yMax < 7800000) {
    return 'EPSG:2975';
  }
  return null;
}

function reprojectCoordinates(coordinates: Position[], sourceProj: string): Position[] {
  // Check for offset projections first
  const offsetProj = OFFSET_PROJECTIONS[sourceProj];
  if (offsetProj) {
    return coordinates.map((coord) => {
      const [x, y, ...rest] = coord;
      const adjustedX = x + offsetProj.xOffset;
      const adjustedY = y + offsetProj.yOffset;
      const [lng, lat] = proj4(offsetProj.proj4, WGS84, [adjustedX, adjustedY]);
      return [lng, lat, ...rest];
    });
  }

  const projDef = KNOWN_PROJECTIONS[sourceProj];
  if (!projDef) return coordinates;

  return coordinates.map((coord) => {
    const [x, y, ...rest] = coord;
    const [lng, lat] = proj4(projDef, WGS84, [x, y]);
    return [lng, lat, ...rest];
  });
}

function reprojectGeometry(geometry: Geometry, sourceProj: string): Geometry {
  if (geometry.type === 'Point') {
    const [x, y] = geometry.coordinates as [number, number];

    const offsetProj = OFFSET_PROJECTIONS[sourceProj];
    if (offsetProj) {
      const adjustedX = x + offsetProj.xOffset;
      const adjustedY = y + offsetProj.yOffset;
      const [lng, lat] = proj4(offsetProj.proj4, WGS84, [adjustedX, adjustedY]);
      return { ...geometry, coordinates: [lng, lat] };
    }

    const projDef = KNOWN_PROJECTIONS[sourceProj];
    if (projDef) {
      const [lng, lat] = proj4(projDef, WGS84, [x, y]);
      return { ...geometry, coordinates: [lng, lat] };
    }
    return geometry;
  }

  if (geometry.type === 'Polygon') {
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

async function testReprojection(zipPath: string) {
  console.log('='.repeat(60));
  console.log('TEST DE REPROJECTION');
  console.log('='.repeat(60));
  console.log();

  const fileBuffer = fs.readFileSync(zipPath);
  const zip = new AdmZip(fileBuffer);
  const zipEntries = zip.getEntries();

  const shpEntry = zipEntries.find((e) => e.entryName.toLowerCase().endsWith('.shp'));
  const dbfEntry = zipEntries.find((e) => e.entryName.toLowerCase().endsWith('.dbf'));

  if (!shpEntry || !dbfEntry) {
    console.error('Fichiers .shp ou .dbf manquants');
    return;
  }

  const shpBuffer = shpEntry.getData();
  const dbfBuffer = dbfEntry.getData();

  const features: Feature[] = [];
  const source = await shapefile.open(shpBuffer, dbfBuffer);

  let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;

  let result = await source.read();
  while (!result.done) {
    if (result.value.geometry !== null) {
      features.push(result.value as Feature);

      if (result.value.geometry.type !== 'GeometryCollection') {
        const coords = JSON.stringify(result.value.geometry.coordinates);
        const numbers = coords.match(/-?\d+\.?\d*/g)?.map(Number) || [];
        for (let i = 0; i < numbers.length; i += 2) {
          const x = numbers[i], y = numbers[i + 1];
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

  console.log(`${features.length} features trouvees`);
  console.log();
  console.log('COORDONNEES ORIGINALES:');
  console.log('-'.repeat(40));
  console.log(`  X: ${xMin.toFixed(2)} a ${xMax.toFixed(2)}`);
  console.log(`  Y: ${yMin.toFixed(2)} a ${yMax.toFixed(2)}`);

  const sourceProjection = detectProjectionFromCoordinates(xMin, xMax, yMin, yMax);

  console.log();
  console.log('DETECTION DE PROJECTION:');
  console.log('-'.repeat(40));

  if (sourceProjection) {
    console.log(`  Projection detectee: ${sourceProjection}`);

    if (OFFSET_PROJECTIONS[sourceProjection]) {
      const offset = OFFSET_PROJECTIONS[sourceProjection];
      console.log(`  Type: Projection avec offset`);
      console.log(`  Offset X: ${offset.xOffset} metres`);
      console.log(`  Offset Y: ${offset.yOffset} metres`);
    }

    console.log();
    console.log('REPROJECTION VERS WGS84:');
    console.log('-'.repeat(40));

    const firstFeature = features[0];
    if (firstFeature && firstFeature.geometry) {
      const originalCoord = (firstFeature.geometry as any).coordinates?.[0]?.[0];
      console.log(`  Avant: [${originalCoord[0].toFixed(2)}, ${originalCoord[1].toFixed(2)}]`);

      const reprojected = reprojectGeometry(firstFeature.geometry, sourceProjection);
      const newCoord = (reprojected as any).coordinates?.[0]?.[0];
      console.log(`  Apres: [${newCoord[0].toFixed(6)}, ${newCoord[1].toFixed(6)}]`);

      // Validate WGS84 range
      const isValidLng = newCoord[0] >= -180 && newCoord[0] <= 180;
      const isValidLat = newCoord[1] >= -90 && newCoord[1] <= 90;
      const location = getLocationName(newCoord[0], newCoord[1]);

      console.log();
      if (isValidLng && isValidLat) {
        console.log('  Coordonnees WGS84 valides!');
        console.log(`     Longitude: ${newCoord[0].toFixed(6)} (${newCoord[0] > 0 ? 'E' : 'W'})`);
        console.log(`     Latitude: ${newCoord[1].toFixed(6)} (${newCoord[1] > 0 ? 'N' : 'S'})`);

        if (location) {
          console.log();
          console.log(`  LOCALISATION: ${location}`);
        }
      } else {
        console.log('  Coordonnees hors plage WGS84');
      }

      // Test all features
      console.log();
      console.log('VERIFICATION DE TOUTES LES FEATURES:');
      console.log('-'.repeat(40));

      let allValid = true;
      let allInLocation = true;

      for (const feature of features) {
        if (feature.geometry) {
          const reproj = reprojectGeometry(feature.geometry, sourceProjection);
          const coords = (reproj as any).coordinates?.[0]?.[0];
          if (coords) {
            const loc = getLocationName(coords[0], coords[1]);
            if (!loc) {
              allInLocation = false;
              console.log(`  Feature hors zone connue: [${coords[0].toFixed(6)}, ${coords[1].toFixed(6)}]`);
            }
          }
        }
      }

      if (allValid && allInLocation) {
        console.log(`  Toutes les ${features.length} features sont dans une zone connue`);
      }
    }
  } else {
    console.log('  Deja en WGS84 ou projection inconnue');
  }

  console.log();
  console.log('='.repeat(60));
}

const zipPath = process.argv[2] || 'tools/perimetre ACV.zip';
testReprojection(zipPath).catch(console.error);
