import fs from 'fs';

import { parse as csvParse } from 'csv-parse';

import { authenticate } from '~/services/ceremaService/ceremaAuthProvider';

import { verifyUsers } from './verification';

const CSV_INPUT_PATH = 'users.csv';

async function readEmailsFromCSV(): Promise<string[]> {
  return new Promise((resolve, reject) => {
    const emails: string[] = [];
    fs.createReadStream(CSV_INPUT_PATH)
      .pipe(
        csvParse({ columns: ['email'], relax_column_count: true, trim: true })
      )
      .on('data', (row) => {
        const email = row['email']?.trim();
        if (email) {
          emails.push(email);
        }
      })
      .on('end', () => resolve(emails))
      .on('error', reject);
  });
}

(async () => {
  try {
    const auth = await authenticate();
    const emails = await readEmailsFromCSV();
    await verifyUsers(auth, emails);
  } catch (err) {
    console.error('Erreur générale :', err);
  }
})();
