import fs from 'fs';
import axios from 'axios';
import { parse as csvParse } from 'csv-parse';
import config from '~/infra/config';
import userRepository from '~/repositories/userRepository';
import { createAuthProvider } from '~/services/ceremaService/ceremaAuthProvider';

const CSV_INPUT_PATH = 'users.csv';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const authProvider = createAuthProvider();

interface AuthResult {
  token: string;
  authPrefix: string;
  apiUrl: string;
}

async function getAuth(): Promise<AuthResult> {
  return authProvider.authenticate();
}

async function readEmailsFromCSV(): Promise<string[]> {
    return new Promise((resolve, reject) => {
        const emails: string[] = [];
        fs.createReadStream(CSV_INPUT_PATH)
            .pipe(csvParse({ columns: ['email'], relax_column_count: true, trim: true }))
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

async function checkEmailWithRetry(
  email: string,
  auth: AuthResult
) {
  const { default: pRetry } = await import('p-retry');
  return pRetry(
    async () => {
      const response = await axios.get(
        `${auth.apiUrl}/api/utilisateurs?email=${encodeURIComponent(email)}`,
        {
          headers: { Authorization: `${auth.authPrefix} ${auth.token}` },
          timeout: 5000
        }
      );
      return response.data;
    },
    {
      retries: 3,
      minTimeout: 500,
      maxTimeout: 2000,
      factor: 2
    }
  );
}

async function verifyUsers(auth: AuthResult, emails: string[]) {
  for (const email of emails) {
    try {
      const data = await checkEmailWithRetry(email, auth);

      if (data.results.length === 0) {
        console.log(`Utilisateur non trouvé pour l'email : ${email}`);
        const user = await userRepository.getByEmail(email);
        if (user) {
          await userRepository.remove(user.id);
          console.log(`Utilisateur local supprimé : ${email} (ID: ${user.id})`);
        } else {
          console.log(`Utilisateur local introuvable : ${email}`);
        }
      } else {
        console.log(`Utilisateur trouvé pour l'email : ${email}`);
        const user = await userRepository.getByEmail(email);
        if (user) {
          await userRepository.remove(user.id);
          console.log(`Utilisateur local supprimé : ${email} (ID: ${user.id})`);
        } else {
          console.log(`Utilisateur local introuvable : ${email}`);
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error(
          `Échec après plusieurs tentatives pour l'email ${email} :`,
          error.message
        );
      } else {
        console.error(
          `Échec après plusieurs tentatives pour l'email ${email} :`,
          error
        );
      }
    }

    await sleep(200);
  }
}

(async () => {
  try {
    const auth = await getAuth();
    console.log(`Using auth version: ${config.cerema.authVersion}`);
    const emails = await readEmailsFromCSV();
    await verifyUsers(auth, emails);
  } catch (err) {
    console.error('Erreur générale :', err);
  }
})();
