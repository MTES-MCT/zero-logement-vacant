import fs from 'fs';
import axios from 'axios';
import { parse as csvParse } from 'csv-parse';
import config from '~/infra/config';
import userRepository from '~/repositories/userRepository';

const API_AUTH_URL = 'https://portaildf.cerema.fr/api/api-token-auth/';
const API_USER_URL = 'https://portaildf.cerema.fr/api/utilisateurs?email=';
const CSV_INPUT_PATH = 'users.csv';

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAuthToken(): Promise<string> {
    const formData = new URLSearchParams();
    formData.append('username', config.cerema.username);
    formData.append('password', config.cerema.password);

    const response = await axios.post(API_AUTH_URL, formData);
    return response.data.token;
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

async function checkEmailWithRetry(email: string, token: string) {
    const { default: pRetry } = await import('p-retry');
    return pRetry(async () => {
        const response = await axios.get(`${API_USER_URL}${encodeURIComponent(email)}`, {
            headers: { Authorization: `Bearer ${token}` },
            timeout: 5000, // Timeout de 5 secondes par requête
        });
        return response.data;
    }, {
        retries: 3,
        minTimeout: 500,
        maxTimeout: 2000,
        factor: 2
    });
}

async function verifyUsers(token: string, emails: string[]) {
    for (const email of emails) {
        try {
            const data = await checkEmailWithRetry(email, token);

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
                console.error(`Échec après plusieurs tentatives pour l'email ${email} :`, error.message);
            } else {
                console.error(`Échec après plusieurs tentatives pour l'email ${email} :`, error);
            }
        }

        await sleep(200);
    }
}

(async () => {
    try {
        const token = await getAuthToken();
        const emails = await readEmailsFromCSV();
        await verifyUsers(token, emails);
    } catch (err) {
        console.error('Erreur générale :', err);
    }
})();
