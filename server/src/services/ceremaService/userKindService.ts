import config from '~/infra/config';
import { logger } from '~/infra/logger';

export interface PortailDFUser {
  id_user: number;
  email: string;
  exterieur: boolean;
  gestionnaire: boolean;
}

export interface PortailDFResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: PortailDFUser[];
}

/**
 * Determine user kind based on exterieur and gestionnaire flags from Portail DF API.
 *
 * Mapping rules:
 * - exterieur=true, gestionnaire=false  → "prestataire"
 * - exterieur=false, gestionnaire=true  → "gestionnaire"
 * - exterieur=true, gestionnaire=true   → "prestataire, gestionnaire"
 * - exterieur=false, gestionnaire=false → "aucun"
 *
 * @param exterieur - Whether the user is external
 * @param gestionnaire - Whether the user is a manager
 * @returns The kind value according to mapping rules
 */
export function determineUserKind(
  exterieur: boolean,
  gestionnaire: boolean
): string {
  if (exterieur && !gestionnaire) {
    return 'prestataire';
  } else if (!exterieur && gestionnaire) {
    return 'gestionnaire';
  } else if (exterieur && gestionnaire) {
    return 'prestataire, gestionnaire';
  } else {
    return 'aucun';
  }
}

/**
 * Fetch user kind from Portail DF API.
 *
 * @param email - User email address
 * @returns The kind value or null if user not found or error occurred
 */
export async function fetchUserKind(email: string): Promise<string | null> {
  try {
    // Authenticate with Portail DF API using multipart/form-data
    const formData = new FormData();
    formData.append('username', config.cerema.username);
    formData.append('password', config.cerema.password);

    const authResponse = await fetch(
      `${config.cerema.api}/api/api-token-auth/`,
      {
        method: 'POST',
        body: formData
      }
    );

    if (!authResponse.ok) {
      logger.error('Failed to authenticate with Portail DF API', {
        status: authResponse.status,
        email
      });
      return null;
    }

    const { token }: any = await authResponse.json();

    // Fetch user data from Portail DF
    const userResponse = await fetch(
      `${config.cerema.api}/api/utilisateurs?email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Token ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!userResponse.ok) {
      logger.error('Failed to fetch user from Portail DF API', {
        status: userResponse.status,
        email
      });
      return null;
    }

    const userContent = await userResponse.json() as PortailDFResponse;

    // No user found
    if (!userContent.results || userContent.results.length === 0) {
      logger.debug('User not found in Portail DF', { email });
      return null;
    }

    // Get first result (should be only one for exact email match)
    const user = userContent.results[0];
    const kind = determineUserKind(user.exterieur, user.gestionnaire);

    logger.info('Fetched user kind from Portail DF', {
      email,
      exterieur: user.exterieur,
      gestionnaire: user.gestionnaire,
      kind
    });

    return kind;
  } catch (error) {
    logger.error('Error fetching user kind from Portail DF', {
      email,
      error: error instanceof Error ? error.message : String(error)
    });
    return null;
  }
}
