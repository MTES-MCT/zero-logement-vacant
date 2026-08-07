import axios from 'axios';

import userRepository from '~/repositories/userRepository';
import type { CeremaAuth } from '~/services/ceremaService/ceremaAuthProvider';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function checkEmailWithRetry(email: string, auth: CeremaAuth) {
  const { default: pRetry } = await import('p-retry');
  return pRetry(
    async () => {
      const response = await axios.get(
        `${auth.apiUrl}/api/utilisateurs?email=${encodeURIComponent(email)}`,
        {
          headers: { Authorization: auth.authorization },
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

async function removeLocalUser(email: string): Promise<void> {
  const user = await userRepository.getByEmail(email);
  if (!user) {
    console.log(`Utilisateur local introuvable : ${email}`);
    return;
  }

  await userRepository.remove(user.id);
  console.log(`Utilisateur local supprimé : ${email} (ID: ${user.id})`);
}

async function verifyUser(auth: CeremaAuth, email: string): Promise<void> {
  try {
    const data = await checkEmailWithRetry(email, auth);
    const status = data.results.length === 0 ? 'non trouvé' : 'trouvé';
    console.log(`Utilisateur ${status} pour l'email : ${email}`);
    await removeLocalUser(email);
  } catch (error) {
    const details = error instanceof Error ? error.message : error;
    console.error(
      `Échec après plusieurs tentatives pour l'email ${email} :`,
      details
    );
  }
}

export async function verifyUsers(
  auth: CeremaAuth,
  emails: string[]
): Promise<void> {
  for (const email of emails) {
    await verifyUser(auth, email);
    await sleep(200);
  }
}
