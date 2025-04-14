import fs from 'fs';
import path from 'path';
import { parse } from '@fast-csv/parse';
import localityRepository from '~/repositories/localityRepository';

async function deleteOutdatedCommunes(filePath: string, dummy = true) {
  const activeInseeCodes = new Set<string>();

  console.log('📥 Reading the CSV file of existing communes...');
  await new Promise<void>((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(parse({ headers: false, delimiter: ';' }))
      .on('error', reject)
      .on('data', (row: string[]) => {
        const insee = row[1]?.trim();
        if (insee) activeInseeCodes.add(insee);
      })
      .on('end', () => {
        console.log(`✅ ${activeInseeCodes.size} INSEE codes loaded from the CSV`);
        resolve();
      });
  });

  console.log('🔍 Retrieving all localities...');
  const allLocalities = await localityRepository.find({});

  let deletedCount = 0;

  for (const locality of allLocalities) {
    if (!activeInseeCodes.has(locality.geoCode)) {
      if (dummy) {
        console.log(`📝 [DUMMY] Locality to delete — ${locality.name} (${locality.geoCode})`);
      } else {
        await localityRepository.remove(locality.id);
        console.log(`🗑️ Deleted — ${locality.name} (${locality.geoCode})`);
        deletedCount++;
      }
    }
  }

  console.log(`✨ Cleanup completed. ${dummy ? '[Simulation]' : ''}`);
  console.log(`📊 Localities deleted: ${deletedCount}`);
}

// ts-node remove-outdated-localities.ts passage.csv --dummy
const args = process.argv.slice(2);
const filePath = args.find(arg => arg.endsWith('.csv'));
const dummy = args.includes('--dummy');

if (!filePath) {
  console.error('❗ Path to the CSV file is required');
  process.exit(1);
}

deleteOutdatedCommunes(path.resolve(filePath), dummy).catch((err) => {
  console.error('💥 Error:', err);
  process.exit(1);
});
