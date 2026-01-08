/**
 * Script d'analyse de fichier shapefile ZIP
 * Usage: npx tsx tools/analyze-shapefile.ts "tools/perimetre ACV.zip"
 */

import AdmZip from 'adm-zip';
import * as fs from 'fs';
import * as path from 'path';
import * as shapefile from 'shapefile';
import shpjs from 'shpjs';

async function analyzeShapefile(zipPath: string): Promise<void> {
  console.log('='.repeat(60));
  console.log('ANALYSE DU FICHIER SHAPEFILE');
  console.log('='.repeat(60));
  console.log();

  // Vérifier que le fichier existe
  if (!fs.existsSync(zipPath)) {
    console.error(`❌ Fichier non trouvé: ${zipPath}`);
    process.exit(1);
  }

  const stats = fs.statSync(zipPath);
  console.log(`📁 Fichier: ${path.basename(zipPath)}`);
  console.log(`📏 Taille: ${(stats.size / 1024).toFixed(2)} KB`);
  console.log();

  // Lire le fichier ZIP
  let zip: AdmZip;
  let zipEntries: AdmZip.IZipEntry[];

  try {
    const fileBuffer = fs.readFileSync(zipPath);
    zip = new AdmZip(fileBuffer);
    zipEntries = zip.getEntries();
  } catch (error) {
    console.error('❌ Erreur lors de la lecture du ZIP:', error);
    process.exit(1);
  }

  // Lister le contenu
  console.log('📦 CONTENU DU ZIP:');
  console.log('-'.repeat(40));
  let hasSpacesInNames = false;
  let hasSubfolders = false;
  zipEntries.forEach((entry) => {
    const ext = path.extname(entry.entryName).toLowerCase();
    const size = entry.header.size;
    const hasSpace = entry.entryName.includes(' ');
    const hasFolder = entry.entryName.includes('/');
    if (hasSpace) hasSpacesInNames = true;
    if (hasFolder) hasSubfolders = true;
    console.log(`  ${entry.entryName} (${size} bytes) [${ext}]${hasSpace ? ' ⚠️ ESPACE' : ''}`);
  });
  console.log();

  if (hasSpacesInNames) {
    console.log('⚠️  ATTENTION: Noms de fichiers avec espaces détectés!');
    console.log('   Certaines bibliothèques (comme shpjs) peuvent mal gérer les espaces.');
    console.log('   → Renommez les fichiers sans espaces avant de zipper.');
    console.log();
  }

  if (hasSubfolders) {
    console.log('⚠️  ATTENTION: Sous-dossiers détectés dans le ZIP!');
    console.log('   Le shapefile doit être à la racine du ZIP.');
    console.log();
  }

  // Vérifier les composants requis
  const shpEntry = zipEntries.find((e) =>
    e.entryName.toLowerCase().endsWith('.shp')
  );
  const dbfEntry = zipEntries.find((e) =>
    e.entryName.toLowerCase().endsWith('.dbf')
  );
  const shxEntry = zipEntries.find((e) =>
    e.entryName.toLowerCase().endsWith('.shx')
  );
  const prjEntry = zipEntries.find((e) =>
    e.entryName.toLowerCase().endsWith('.prj')
  );

  console.log('🔍 COMPOSANTS SHAPEFILE:');
  console.log('-'.repeat(40));
  console.log(`  .shp (géométrie):     ${shpEntry ? '✅ Présent' : '❌ MANQUANT'}`);
  console.log(`  .dbf (attributs):     ${dbfEntry ? '✅ Présent' : '❌ MANQUANT'}`);
  console.log(`  .shx (index):         ${shxEntry ? '✅ Présent' : '⚠️  Optionnel'}`);
  console.log(`  .prj (projection):    ${prjEntry ? '✅ Présent' : '⚠️  Optionnel'}`);
  console.log();

  if (!shpEntry || !dbfEntry) {
    console.error('❌ ERREUR: Composants requis manquants (.shp et .dbf)');
    process.exit(1);
  }

  // Analyser le shapefile
  console.log('📊 ANALYSE DU SHAPEFILE:');
  console.log('-'.repeat(40));

  try {
    const shpBuffer = shpEntry.getData();
    const dbfBuffer = dbfEntry.getData();

    console.log(`  Taille .shp: ${shpBuffer.length} bytes`);
    console.log(`  Taille .dbf: ${dbfBuffer.length} bytes`);

    // Lire le header du shapefile pour détecter le type et les dimensions
    // https://www.esri.com/content/dam/esrisites/sitecore-archive/Files/Pdfs/library/whitepapers/pdfs/shapefile.pdf
    const shapeTypeCode = shpBuffer.readInt32LE(32);
    const shapeTypes: Record<number, string> = {
      0: 'Null Shape',
      1: 'Point (2D)',
      3: 'PolyLine (2D)',
      5: 'Polygon (2D)',
      8: 'MultiPoint (2D)',
      11: 'PointZ (3D avec Z)',
      13: 'PolyLineZ (3D avec Z)',
      15: 'PolygonZ (3D avec Z)',
      18: 'MultiPointZ (3D avec Z)',
      21: 'PointM (2D avec M)',
      23: 'PolyLineM (2D avec M)',
      25: 'PolygonM (2D avec M)',
      28: 'MultiPointM (2D avec M)',
      31: 'MultiPatch'
    };

    const shapeTypeName = shapeTypes[shapeTypeCode] || `Inconnu (${shapeTypeCode})`;
    const is3D = [11, 13, 15, 18].includes(shapeTypeCode);
    const hasM = [21, 23, 25, 28].includes(shapeTypeCode) || [11, 13, 15, 18].includes(shapeTypeCode);

    console.log();
    console.log('  📐 HEADER DU SHAPEFILE:');
    console.log(`    Type de géométrie: ${shapeTypeName} (code: ${shapeTypeCode})`);
    console.log(`    3D (Z): ${is3D ? '⚠️  OUI' : '✅ Non'}`);
    console.log(`    Mesure (M): ${hasM ? '⚠️  OUI' : '✅ Non'}`);

    // Bounding box du header
    const xMin = shpBuffer.readDoubleLE(36);
    const yMin = shpBuffer.readDoubleLE(44);
    const xMax = shpBuffer.readDoubleLE(52);
    const yMax = shpBuffer.readDoubleLE(60);

    console.log();
    console.log('  📍 BOUNDING BOX (header):');
    console.log(`    X: ${xMin.toFixed(6)} à ${xMax.toFixed(6)}`);
    console.log(`    Y: ${yMin.toFixed(6)} à ${yMax.toFixed(6)}`);

    if (is3D) {
      const zMin = shpBuffer.readDoubleLE(68);
      const zMax = shpBuffer.readDoubleLE(76);
      console.log(`    Z: ${zMin.toFixed(6)} à ${zMax.toFixed(6)}`);
      console.log();
      console.log('  ⚠️  ATTENTION: Shapefile 3D détecté!');
      console.log('     shpjs peut avoir des problèmes avec les shapefiles 3D.');
      console.log('     → Convertissez en 2D avec: ogr2ogr -dim 2 output.shp input.shp');
    }

    // Ouvrir et lire le shapefile
    const source = await shapefile.open(shpBuffer, dbfBuffer);

    let featureCount = 0;
    const geometryTypes = new Set<string>();
    let firstFeature: any = null;
    const allProperties: Set<string> = new Set();

    let result = await source.read();
    while (!result.done) {
      featureCount++;
      const feature = result.value;

      if (feature.geometry) {
        geometryTypes.add(feature.geometry.type);
      }

      if (feature.properties) {
        Object.keys(feature.properties).forEach((key) => allProperties.add(key));
      }

      if (!firstFeature) {
        firstFeature = feature;
      }

      result = await source.read();
    }

    console.log();
    console.log(`  Nombre de features: ${featureCount}`);
    console.log(`  Types de géométrie: ${Array.from(geometryTypes).join(', ') || 'Aucun'}`);
    console.log(`  Attributs: ${Array.from(allProperties).join(', ') || 'Aucun'}`);
    console.log();

    // Afficher le premier feature en détail
    if (firstFeature) {
      console.log('📝 PREMIER FEATURE (exemple):');
      console.log('-'.repeat(40));
      console.log('  Géométrie:', JSON.stringify(firstFeature.geometry, null, 2).split('\n').map((l, i) => i === 0 ? l : '  ' + l).join('\n'));
      console.log('  Propriétés:', JSON.stringify(firstFeature.properties, null, 2));
    }

    // Vérification des limites
    console.log();
    console.log('⚙️  VÉRIFICATION DES LIMITES:');
    console.log('-'.repeat(40));
    const maxFeatures = 500; // Valeur par défaut de config
    if (featureCount > maxFeatures) {
      console.log(`  ❌ ERREUR: ${featureCount} features > limite de ${maxFeatures}`);
    } else {
      console.log(`  ✅ OK: ${featureCount} features <= limite de ${maxFeatures}`);
    }

    // Vérifier la projection
    console.log();
    console.log('🌍 ANALYSE DE LA PROJECTION:');
    console.log('-'.repeat(40));

    if (prjEntry) {
      const prjContent = prjEntry.getData().toString('utf-8');
      console.log('  Fichier .prj trouvé:');
      console.log(`  ${prjContent.substring(0, 200)}${prjContent.length > 200 ? '...' : ''}`);
    } else {
      console.log('  ⚠️  Fichier .prj MANQUANT - projection inconnue');
    }

    // Analyser les coordonnées
    if (firstFeature?.geometry?.coordinates) {
      const coords = firstFeature.geometry.coordinates;
      const flatCoords = JSON.stringify(coords).match(/-?\d+\.?\d*/g)?.map(Number) || [];
      const xCoords = flatCoords.filter((_, i) => i % 2 === 0);
      const yCoords = flatCoords.filter((_, i) => i % 2 === 1);

      const minX = Math.min(...xCoords);
      const maxX = Math.max(...xCoords);
      const minY = Math.min(...yCoords);
      const maxY = Math.max(...yCoords);

      console.log();
      console.log('  Étendue des coordonnées:');
      console.log(`    X: ${minX.toFixed(2)} à ${maxX.toFixed(2)}`);
      console.log(`    Y: ${minY.toFixed(2)} à ${maxY.toFixed(2)}`);

      // Détecter le système de coordonnées
      const isWGS84 = minX >= -180 && maxX <= 180 && minY >= -90 && maxY <= 90;
      const isLambert93 = minX > 100000 && maxX < 1300000 && minY > 6000000 && maxY < 7200000;
      const isLambert93Extended = minX > 1600000 && maxX < 1800000 && minY > 9200000 && maxY < 9300000;

      console.log();
      if (isWGS84) {
        console.log('  ✅ Projection détectée: WGS84 (EPSG:4326) - Compatible');
      } else if (isLambert93) {
        console.log('  ⚠️  Projection détectée: Lambert 93 (EPSG:2154)');
        console.log('     Le serveur attend des coordonnées en WGS84 (longitude/latitude)');
        console.log('     → Reprojetez le shapefile en WGS84 avant l\'upload');
      } else if (isLambert93Extended) {
        console.log('  ⚠️  Projection détectée: Probablement Lambert 93 étendu ou UTM');
        console.log('     Le serveur attend des coordonnées en WGS84 (longitude/latitude)');
        console.log('     → Reprojetez le shapefile en WGS84 avant l\'upload');
      } else {
        console.log('  ⚠️  Projection inconnue - les coordonnées ne semblent pas en WGS84');
        console.log(`     Plage X: ${minX} - ${maxX}`);
        console.log(`     Plage Y: ${minY} - ${maxY}`);
        console.log('     → Vérifiez la projection et convertissez en WGS84 si nécessaire');
      }
    }

    // Tester avec shpjs (comme le fait le serveur)
    console.log();
    console.log('🔧 TEST AVEC SHPJS (simulation serveur):');
    console.log('-'.repeat(40));

    try {
      const fileBuffer = fs.readFileSync(zipPath);
      const geojson = await shpjs(fileBuffer);
      const featureCollections = Array.isArray(geojson) ? geojson : [geojson];
      const allFeatures = featureCollections.flatMap((fc) => fc.features);

      console.log(`  ✅ shpjs a parsé ${allFeatures.length} features avec succès`);

      if (allFeatures.length > 0 && allFeatures[0].geometry) {
        const geom = allFeatures[0].geometry as any;
        const firstCoord = JSON.stringify(geom.coordinates?.[0]?.[0] || geom.coordinates?.[0]);
        console.log(`  Premier point après parsing: ${firstCoord}`);
      }
    } catch (shpjsError) {
      console.log('  ❌ ERREUR shpjs:', shpjsError instanceof Error ? shpjsError.message : String(shpjsError));
      console.log();
      console.log('  C\'est probablement l\'erreur que vous voyez lors de l\'upload!');
    }

    console.log();
    console.log('='.repeat(60));
    console.log('✅ ANALYSE TERMINÉE');
    console.log('='.repeat(60));

  } catch (error) {
    console.error();
    console.error('❌ ERREUR lors de l\'analyse du shapefile:');
    console.error(error);

    // Analyser l'erreur plus en détail
    if (error instanceof Error) {
      console.error();
      console.error('📋 Détails de l\'erreur:');
      console.error(`  Message: ${error.message}`);
      console.error(`  Stack: ${error.stack}`);
    }

    process.exit(1);
  }
}

// Exécution
const zipPath = process.argv[2] || 'tools/perimetre ACV.zip';
analyzeShapefile(zipPath).catch(console.error);
