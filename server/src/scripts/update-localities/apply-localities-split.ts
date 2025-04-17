import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import localityRepository, { Localities } from '~/repositories/localityRepository';
import { Establishments } from '~/repositories/establishmentRepository';
import db from '~/infra/database';

type Row = {
  oldInsee: string;
  insee: string;
  oldCity: string;
  city: string;
};

async function processCSV(filePath: string, dummy = true) {
    const rows: Row[] = [];
  
    const parser = fs.createReadStream(filePath).pipe(
      parse({ delimiter: ';', trim: true, skip_empty_lines: true })
    );
  
    for await (const row of parser) {
      const oldInsee = row[0]?.trim();
      const insee = row[1]?.trim();
      const oldCity = row[2]?.trim();
      const city = row[3]?.trim();
      rows.push({ oldInsee, insee, oldCity, city });
    }
  
    console.log(`📄 ${rows.length} rows read from the CSV`);
  
    const countMap = rows.reduce((acc: Record<string, number>, row) => {
      acc[row.oldInsee] = (acc[row.oldInsee] || 0) + 1;
      return acc;
    }, {});
  
    const duplicateGroups = Object.entries(countMap)
      .filter(([_, count]) => count > 1)
      .map(([oldInsee]) => rows.filter(row => row.oldInsee === oldInsee));
  
    let totalProcessed = 0;
  
    for (const group of duplicateGroups) {
      const reference = group.find(row => row.oldInsee === row.insee);
      const { city: referenceCity, oldInsee, insee: referenceInsee } = reference ?? {};
      const allCities = group.map(row => row.city);
      const oldCities = group.map(row => row.oldCity);
      
      const oldCityIsPresent = oldCities.some(old => allCities.includes(old));
  
      const existingLocalities = await localityRepository.find({
        filters: { geoCode: oldInsee },
      });
  
      if (existingLocalities.length === 0) {
        console.warn(`❌ No existing locality found for INSEE ${oldInsee}`);
        continue;
      }
  
      const existingLocality = existingLocalities[0];
  
      if (!oldCityIsPresent) {
        // CAS 1 - une commune devient plusieurs nouvelles communes (exemple : Kirrwiller-Bosselshausen devient Kirrwiller et Bosselshausen, Kirrwiller-Bosselshausen n'existe plus)
        if (dummy) {
          console.log(`📝 [DUMMY] Updating locality ${oldInsee} to ${referenceCity}`);
        } else {
          await Localities().where({ id: existingLocality.id }).update({
            name: referenceCity,
            geo_code: group[0].insee,
          });
  
          await Establishments()
            .join('establishments_localities', 'establishments.id', 'establishments_localities.establishment_id')
            .where('establishments_localities.locality_id', existingLocality.id)
            .update({ name: `Commune de ${referenceCity}`, localities_geo_code: [referenceInsee] });
        }
  
        for (const row of group.slice(1)) {
          if (dummy) {
            console.log(`🆕 [DUMMY] Creating locality ${row.insee} - ${row.city}`);
            console.log(`🏢 [DUMMY] Creating establishment Commune ${row.city}`);
          } else {
            const [newLocalityId] = await Localities()
              .insert({ name: row.city, geo_code: row.insee })
              .returning('id');
  
            await Establishments().insert({
              name: `Commune ${row.city}`,
            });
  
            const [newEstablishmentId] = await Establishments()
              .insert({ name: `Commune ${row.city}`, localities_geo_code: [row.insee], kind:'Commune', source: 'seed' })
              .returning('id');
  
            await db('establishments_localities').insert({
              establishment_id: newEstablishmentId,
              locality_id: newLocalityId,
            });
          }
        }
  
      } else {
        // CAS 2 - une commune reste mais avec de nouvelles divisions (exemple : Fréhel devient Fréhel et Plévenon) 
        for (const row of group) {
          if (dummy) {
            console.log(`🆕 [DUMMY] Creating locality ${row.insee} - ${row.city}`);
            console.log(`🏢 [DUMMY] Creating establishment Commune ${row.city}`);
          } else {
            const [newLocalityId] = await Localities()
              .insert({ name: row.city, geo_code: row.insee })
              .returning('id');
  
            const [newEstablishmentId] = await Establishments()
              .insert({ name: `Commune ${row.city}`, localities_geo_code: [row.insee], kind:'Commune', source: 'seed' })
              .returning('id');
  
            await db('establishments_localities').insert({
              establishment_id: newEstablishmentId,
              locality_id: newLocalityId,
            });
          }
        }
      }
  
      totalProcessed += group.length;
    }
  
    console.log(`✅ Processed ${totalProcessed} rows from duplicate groups`);
  }
  
// Usage: node update-localities.js path/to/file.csv --dummy
const args = process.argv.slice(2);
const filePath = args.find(arg => arg.endsWith('.csv'));
const dummy = args.includes('--dummy');

if (!filePath) {
  console.error('❗ Please provide the path to a CSV file');
  process.exit(1);
}

processCSV(path.resolve(filePath), dummy).catch((err) => {
  console.error('Erreur critique :', err);
});
