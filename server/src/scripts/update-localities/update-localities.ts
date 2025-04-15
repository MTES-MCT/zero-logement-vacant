import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse';
import localityRepository from '~/repositories/localityRepository';
import db from '~/infra/database';

type Row = {
  oldInsee: string;
  insee: string;
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
    const city = row[2]?.trim();

    rows.push({ oldInsee, insee, city });
  }

  console.log(`📄 ${rows.length} rows read from the CSV`);

  let count = 0;
  for (const { oldInsee, insee, city } of rows) {
    try {
      const matches = await localityRepository.find({
        filters: {
          geoCode: oldInsee,
        },
      });

      if (matches.length === 1 && matches[0].geoCode !== insee) {
        const locality = matches[0];
        count++;
        if (dummy) {
          console.log(`📝 [DUMMY] ${city} — INSEE: ${locality.geoCode} (${locality.name}) ➡️ ${insee} (${city})`);
        } else {
          console.log({
            ...locality,
            name: city,
            geoCode: insee,
          });
          try {
            await db.raw(
              `UPDATE localities SET name = ?, geo_code = ? WHERE id = ?`,
              [city, insee, locality.id]
            );
          } catch (err) {
            const msg = (err instanceof Error) ? err.message : String(err);

            if (msg.includes('duplicate key value') && msg.includes('localities_geo_code_unique')) {
              await db('localities').where({ id: locality.id }).del();
            } else {
              throw err;
            }
          }

          console.log(`✅ ${city} updated — INSEE: ${locality.geoCode} (${locality.name}) ➡️ ${insee} (${city})`);
        }
      } else if (matches.length > 1) {
        console.warn(`⚠️ Multiple matches for ${city} (${oldInsee})`);
      } else {
        console.warn(`❌ No match found for ${city} (${oldInsee})`);
      }
    } catch (err) {
      console.error(`Error on ${city} (${oldInsee}):`, err);
    }
  }
  console.log(`✅ ${count} updated localities`);
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
