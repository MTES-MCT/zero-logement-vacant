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

const WGS84 = '+proj=longlat +datum=WGS84 +no_defs +type=crs';

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
  if (xMin > 1600000 && xMax < 1900000 && yMin > 9100000 && yMax < 9400000) {
    return 'EPSG:2975';
  }
  if (xMin > 300000 && xMax < 900000 && yMin > 7600000 && yMax < 7900000) {
    return 'EPSG:2975';
  }
  return null;
}

function reprojectCoordinates(coordinates: Position[], sourceProj: string): Position[] {
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
    const [lng, lat] = proj4(
      KNOWN_PROJECTIONS[sourceProj],
      WGS84,
      geometry.coordinates as [number, number]
    );
    return { ...geometry, coordinates: [lng, lat] };
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
    console.error('❌ Fichiers .shp ou .dbf manquants');
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

  console.log(`📊 ${features.length} features trouvées`);
  console.log();
  console.log('📍 COORDONNÉES ORIGINALES:');
  console.log('-'.repeat(40));
  console.log(`  X: ${xMin.toFixed(2)} à ${xMax.toFixed(2)}`);
  console.log(`  Y: ${yMin.toFixed(2)} à ${yMax.toFixed(2)}`);

  const sourceProjection = detectProjectionFromCoordinates(xMin, xMax, yMin, yMax);

  console.log();
  console.log('🔍 DÉTECTION DE PROJECTION:');
  console.log('-'.repeat(40));

  if (sourceProjection) {
    console.log(`  Projection détectée: ${sourceProjection}`);
    console.log();
    console.log('🔄 REPROJECTION VERS WGS84:');
    console.log('-'.repeat(40));

    const firstFeature = features[0];
    if (firstFeature && firstFeature.geometry) {
      const originalCoord = (firstFeature.geometry as any).coordinates?.[0]?.[0];
      console.log(`  Avant: [${originalCoord[0].toFixed(2)}, ${originalCoord[1].toFixed(2)}]`);

      const reprojected = reprojectGeometry(firstFeature.geometry, sourceProjection);
      const newCoord = (reprojected as any).coordinates?.[0]?.[0];
      console.log(`  Après: [${newCoord[0].toFixed(6)}, ${newCoord[1].toFixed(6)}]`);

      // Validate WGS84 range
      const isValidLng = newCoord[0] >= -180 && newCoord[0] <= 180;
      const isValidLat = newCoord[1] >= -90 && newCoord[1] <= 90;

      console.log();
      if (isValidLng && isValidLat) {
        console.log('  ✅ Coordonnées WGS84 valides!');
        console.log(`     Longitude: ${newCoord[0].toFixed(6)}° (${newCoord[0] > 0 ? 'E' : 'W'})`);
        console.log(`     Latitude: ${newCoord[1].toFixed(6)}° (${newCoord[1] > 0 ? 'N' : 'S'})`);
      } else {
        console.log('  ❌ Coordonnées hors plage WGS84');
      }
    }
  } else {
    console.log('  Déjà en WGS84 ou projection inconnue');
  }

  console.log();
  console.log('='.repeat(60));
}

const zipPath = process.argv[2] || 'tools/perimetre ACV.zip';
testReprojection(zipPath).catch(console.error);
