#!/usr/bin/env tsx

/**
 * Script to check SIREN/SIRET uniqueness in CSV files
 *
 * Usage:
 *   npx tsx server/src/scripts/import-establishments/check-uniqueness.ts
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface CSVRow {
  'Name-zlv': string;
  'Name-source': string;
  'Kind-admin_meta': string;
  'Kind-admin': string;
  'Kind-admin_label': string;
  Siren: string;
  Siret: string;
  'Layer-geo_label': string;
  Geo_Perimeter: string;
  Dep_Code: string;
  Dep_Name: string;
  Reg_Code: string;
  Reg_Name: string;
  Millesime: string;
}


function loadCSV(filePath: string): CSVRow[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

function checkUniqueness() {
  const scriptDir = __dirname;
  const files = [
    { path: path.join(scriptDir, 'entities_processed.csv'), name: 'entities' },
    { path: path.join(scriptDir, 'collectivities_processed.csv'), name: 'collectivities' }
  ];

  console.log('='.repeat(80));
  console.log('SIREN/SIRET UNIQUENESS CHECK');
  console.log('='.repeat(80));
  console.log();

  // Maps to track duplicates
  const sirenMap = new Map<string, Array<{ name: string; siret: string; kind: string; file: string }>>();
  const siretMap = new Map<string, Array<{ name: string; siren: string; kind: string; file: string }>>();
  const pairMap = new Map<string, Array<{ name: string; kind: string; file: string }>>();

  let totalRows = 0;
  let emptySiren = 0;
  let emptySiret = 0;
  let invalidSiren = 0;
  let invalidSiret = 0;

  // Load all data
  for (const file of files) {
    console.log(`📁 Loading ${file.name}: ${file.path}`);

    if (!fs.existsSync(file.path)) {
      console.error(`   ❌ File not found: ${file.path}`);
      continue;
    }

    const rows = loadCSV(file.path);
    console.log(`   ✅ Loaded ${rows.length} rows`);
    totalRows += rows.length;

    // Process each row
    for (const row of rows) {
      const siren = row.Siren?.trim();
      const siret = row.Siret?.trim();
      const name = row['Name-zlv'] || row['Name-source'];
      const kind = row['Kind-admin'];

      // Check for empty values
      if (!siren) {
        emptySiren++;
        console.warn(`   ⚠️  Empty SIREN for: ${name}`);
        continue;
      }
      if (!siret) {
        emptySiret++;
        console.warn(`   ⚠️  Empty SIRET for: ${name}`);
        continue;
      }

      // Validate SIREN (9 digits)
      if (!/^\d{9}$/.test(siren)) {
        invalidSiren++;
        console.warn(`   ⚠️  Invalid SIREN format (${siren}) for: ${name}`);
      }

      // Validate SIRET (14 digits)
      if (!/^\d{14}$/.test(siret)) {
        invalidSiret++;
        console.warn(`   ⚠️  Invalid SIRET format (${siret}) for: ${name}`);
      }

      // Validate that SIRET starts with SIREN
      if (!siret.startsWith(siren)) {
        console.warn(`   ⚠️  SIRET (${siret}) doesn't start with SIREN (${siren}) for: ${name}`);
      }

      // Track SIREN duplicates
      if (!sirenMap.has(siren)) {
        sirenMap.set(siren, []);
      }
      sirenMap.get(siren)!.push({ name, siret, kind, file: file.name });

      // Track SIRET duplicates
      if (!siretMap.has(siret)) {
        siretMap.set(siret, []);
      }
      siretMap.get(siret)!.push({ name, siren, kind, file: file.name });

      // Track SIREN/SIRET pair duplicates
      const pairKey = `${siren}|${siret}`;
      if (!pairMap.has(pairKey)) {
        pairMap.set(pairKey, []);
      }
      pairMap.get(pairKey)!.push({ name, kind, file: file.name });
    }
    console.log();
  }

  // Report summary
  console.log('='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total rows processed: ${totalRows}`);
  console.log(`Empty SIREN: ${emptySiren}`);
  console.log(`Empty SIRET: ${emptySiret}`);
  console.log(`Invalid SIREN format: ${invalidSiren}`);
  console.log(`Invalid SIRET format: ${invalidSiret}`);
  console.log();

  // Check SIREN uniqueness
  const sirenDuplicates = Array.from(sirenMap.entries())
    .filter(([, entries]) => entries.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log('='.repeat(80));
  console.log('SIREN DUPLICATES');
  console.log('='.repeat(80));
  if (sirenDuplicates.length === 0) {
    console.log('✅ All SIREN values are unique!');
  } else {
    console.log(`❌ Found ${sirenDuplicates.length} duplicate SIREN values\n`);

    for (const [siren, entries] of sirenDuplicates.slice(0, 10)) {
      console.log(`SIREN: ${siren} (${entries.length} occurrences)`);
      for (const entry of entries) {
        console.log(`  - ${entry.name} (${entry.kind}, SIRET: ${entry.siret}) [${entry.file}]`);
      }
      console.log();
    }

    if (sirenDuplicates.length > 10) {
      console.log(`... and ${sirenDuplicates.length - 10} more duplicate SIREN values`);
      console.log();
    }
  }

  // Check SIRET uniqueness
  const siretDuplicates = Array.from(siretMap.entries())
    .filter(([, entries]) => entries.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log('='.repeat(80));
  console.log('SIRET DUPLICATES');
  console.log('='.repeat(80));
  if (siretDuplicates.length === 0) {
    console.log('✅ All SIRET values are unique!');
  } else {
    console.log(`❌ Found ${siretDuplicates.length} duplicate SIRET values\n`);

    for (const [siret, entries] of siretDuplicates.slice(0, 10)) {
      console.log(`SIRET: ${siret} (${entries.length} occurrences)`);
      for (const entry of entries) {
        console.log(`  - ${entry.name} (${entry.kind}, SIREN: ${entry.siren}) [${entry.file}]`);
      }
      console.log();
    }

    if (siretDuplicates.length > 10) {
      console.log(`... and ${siretDuplicates.length - 10} more duplicate SIRET values`);
      console.log();
    }
  }

  // Check SIREN/SIRET pair uniqueness
  const pairDuplicates = Array.from(pairMap.entries())
    .filter(([, entries]) => entries.length > 1)
    .sort((a, b) => b[1].length - a[1].length);

  console.log('='.repeat(80));
  console.log('SIREN/SIRET PAIR DUPLICATES');
  console.log('='.repeat(80));
  if (pairDuplicates.length === 0) {
    console.log('✅ All SIREN/SIRET pairs are unique!');
  } else {
    console.log(`❌ Found ${pairDuplicates.length} duplicate SIREN/SIRET pairs\n`);

    for (const [pair, entries] of pairDuplicates.slice(0, 10)) {
      const [siren, siret] = pair.split('|');
      console.log(`SIREN/SIRET: ${siren}/${siret} (${entries.length} occurrences)`);
      for (const entry of entries) {
        console.log(`  - ${entry.name} (${entry.kind}) [${entry.file}]`);
      }
      console.log();
    }

    if (pairDuplicates.length > 10) {
      console.log(`... and ${pairDuplicates.length - 10} more duplicate pairs`);
      console.log();
    }
  }

  // Final verdict
  console.log('='.repeat(80));
  console.log('FINAL VERDICT');
  console.log('='.repeat(80));

  const hasIssues =
    emptySiren > 0 ||
    emptySiret > 0 ||
    invalidSiren > 0 ||
    invalidSiret > 0 ||
    sirenDuplicates.length > 0 ||
    siretDuplicates.length > 0 ||
    pairDuplicates.length > 0;

  if (hasIssues) {
    console.log('❌ ISSUES FOUND:');
    if (emptySiren > 0) console.log(`   - ${emptySiren} empty SIREN values`);
    if (emptySiret > 0) console.log(`   - ${emptySiret} empty SIRET values`);
    if (invalidSiren > 0) console.log(`   - ${invalidSiren} invalid SIREN formats`);
    if (invalidSiret > 0) console.log(`   - ${invalidSiret} invalid SIRET formats`);
    if (sirenDuplicates.length > 0) console.log(`   - ${sirenDuplicates.length} duplicate SIREN values`);
    if (siretDuplicates.length > 0) console.log(`   - ${siretDuplicates.length} duplicate SIRET values`);
    if (pairDuplicates.length > 0) console.log(`   - ${pairDuplicates.length} duplicate SIREN/SIRET pairs`);
    console.log();
    console.log('⚠️  Consider investigating these issues before importing');
    process.exit(1);
  } else {
    console.log('✅ All checks passed! Data is ready for import.');
    process.exit(0);
  }
}

// Run the check
checkUniqueness();
