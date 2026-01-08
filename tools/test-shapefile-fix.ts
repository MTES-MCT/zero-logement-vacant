/**
 * Script de test avant/après pour vérifier le correctif des Null Shapes
 * Usage: npx tsx tools/test-shapefile-fix.ts "tools/perimetre ACV.zip"
 */

import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import * as shapefile from 'shapefile';
import shpjs from 'shpjs';
import { Feature, FeatureCollection, Geometry } from 'geojson';

async function testWithShpjs(zipPath: string): Promise<{ success: boolean; error?: string; featureCount?: number }> {
  try {
    const fileBuffer = fs.readFileSync(zipPath);
    const geojson = await shpjs(fileBuffer);
    const featureCollections = Array.isArray(geojson) ? geojson : [geojson];
    const features = featureCollections.flatMap((fc) => fc.features);
    return { success: true, featureCount: features.length };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function parseShapefileFromZip(fileBuffer: Buffer): Promise<FeatureCollection> {
  const zip = new AdmZip(fileBuffer);
  const zipEntries = zip.getEntries();

  const shpEntry = zipEntries.find((entry) =>
    entry.entryName.toLowerCase().endsWith('.shp')
  );
  const dbfEntry = zipEntries.find((entry) =>
    entry.entryName.toLowerCase().endsWith('.dbf')
  );

  if (!shpEntry || !dbfEntry) {
    throw new Error('Missing required shapefile components (.shp and .dbf)');
  }

  const shpBuffer = shpEntry.getData();
  const dbfBuffer = dbfEntry.getData();

  const features: Feature[] = [];
  const source = await shapefile.open(shpBuffer, dbfBuffer);

  let result = await source.read();
  while (!result.done) {
    const feature = result.value;
    // Filter out Null Shapes (features with null geometry)
    if (feature.geometry !== null) {
      features.push(feature as Feature);
    }
    result = await source.read();
  }

  return {
    type: 'FeatureCollection',
    features
  };
}

async function testWithShapefileLib(zipPath: string): Promise<{ success: boolean; error?: string; featureCount?: number; nullShapesFiltered?: number }> {
  try {
    const fileBuffer = fs.readFileSync(zipPath);

    // Count total features including null shapes
    const zip = new AdmZip(fileBuffer);
    const zipEntries = zip.getEntries();
    const shpEntry = zipEntries.find((entry) =>
      entry.entryName.toLowerCase().endsWith('.shp')
    );
    const dbfEntry = zipEntries.find((entry) =>
      entry.entryName.toLowerCase().endsWith('.dbf')
    );

    if (!shpEntry || !dbfEntry) {
      return { success: false, error: 'Missing shapefile components' };
    }

    const shpBuffer = shpEntry.getData();
    const dbfBuffer = dbfEntry.getData();

    let totalCount = 0;
    let nullCount = 0;
    const source = await shapefile.open(shpBuffer, dbfBuffer);
    let result = await source.read();
    while (!result.done) {
      totalCount++;
      if (result.value.geometry === null) {
        nullCount++;
      }
      result = await source.read();
    }

    // Now parse with the fix
    const featureCollection = await parseShapefileFromZip(fileBuffer);

    return {
      success: true,
      featureCount: featureCollection.features.length,
      nullShapesFiltered: nullCount
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function main(zipPath: string) {
  console.log('='.repeat(60));
  console.log('TEST AVANT/APRÈS - CORRECTIF NULL SHAPES');
  console.log('='.repeat(60));
  console.log();
  console.log(`Fichier: ${path.basename(zipPath)}`);
  console.log();

  // Test AVANT (avec shpjs - méthode actuelle)
  console.log('1. TEST AVANT (shpjs - méthode actuelle):');
  console.log('-'.repeat(40));
  const beforeResult = await testWithShpjs(zipPath);
  if (beforeResult.success) {
    console.log(`   ✅ Succès: ${beforeResult.featureCount} features parsées`);
  } else {
    console.log(`   ❌ ÉCHEC: ${beforeResult.error}`);
  }
  console.log();

  // Test APRÈS (avec shapefile library - correctif)
  console.log('2. TEST APRÈS (shapefile library - correctif):');
  console.log('-'.repeat(40));
  const afterResult = await testWithShapefileLib(zipPath);
  if (afterResult.success) {
    console.log(`   ✅ Succès: ${afterResult.featureCount} features parsées`);
    if (afterResult.nullShapesFiltered && afterResult.nullShapesFiltered > 0) {
      console.log(`   ℹ️  ${afterResult.nullShapesFiltered} Null Shapes filtrées`);
    }
  } else {
    console.log(`   ❌ ÉCHEC: ${afterResult.error}`);
  }
  console.log();

  // Résumé
  console.log('='.repeat(60));
  console.log('RÉSUMÉ:');
  console.log('='.repeat(60));

  if (!beforeResult.success && afterResult.success) {
    console.log('✅ Le correctif résout le problème!');
    console.log(`   - Avant: ÉCHEC (${beforeResult.error})`);
    console.log(`   - Après: SUCCÈS (${afterResult.featureCount} features)`);
  } else if (beforeResult.success && afterResult.success) {
    console.log('ℹ️  Les deux méthodes fonctionnent pour ce fichier');
    console.log(`   - shpjs: ${beforeResult.featureCount} features`);
    console.log(`   - shapefile: ${afterResult.featureCount} features`);
  } else if (!beforeResult.success && !afterResult.success) {
    console.log('❌ Les deux méthodes échouent - problème différent');
    console.log(`   - shpjs: ${beforeResult.error}`);
    console.log(`   - shapefile: ${afterResult.error}`);
  } else {
    console.log('⚠️  Résultat inattendu');
  }
}

const zipPath = process.argv[2] || 'tools/perimetre ACV.zip';
main(zipPath).catch(console.error);
