import {
  CeremaGroup,
  CeremaPerimeter,
  CeremaUser,
  ConsultUserService
} from './consultUserService';

import config from '~/infra/config';
import { logger } from '~/infra/logger';

/**
 * Check if a LOVAC access date is valid (in the future).
 */
function isLovacAccessValid(accesLovac: string | null): boolean {
  if (!accesLovac) {
    return false;
  }

  try {
    const accessDate = new Date(accesLovac);
    const now = new Date();
    return accessDate > now;
  } catch {
    return false;
  }
}

/**
 * Make an authenticated API call to Portail DF
 */
async function fetchPortailDF<T>(
  token: string,
  endpoint: string
): Promise<T | null> {
  try {
    const response = await fetch(`${config.cerema.api}${endpoint}`, {
      method: 'GET',
      headers: {
        Authorization: `Token ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      logger.warn('Failed to fetch from Portail DF', {
        endpoint,
        status: response.status
      });
      return null;
    }

    return (await response.json()) as T;
  } catch (error) {
    logger.error('Error fetching from Portail DF', { endpoint, error });
    return null;
  }
}

export class CeremaService implements ConsultUserService {
  async consultUsers(email: string): Promise<CeremaUser[]> {
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
          status: authResponse.status
        });
        return [];
      }

      const { token }: any = await authResponse.json();

      const userResponse = await fetch(
        `${config.cerema.api}/api/utilisateurs/?email=${encodeURIComponent(email)}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const userContent: any = await userResponse.json();
      if (userResponse.status !== 200) {
        throw userContent.detail;
      }

      if (userContent) {
        const users = await Promise.all(
          userContent.results.map(
            async (user: { email: any; structure: number; groupe: number }) => {
              const establishmentResponse = await fetch(
                `${config.cerema.api}/api/structures/${user.structure}/`,
                {
                  method: 'GET',
                  headers: {
                    Authorization: `Token ${token}`,
                    'Content-Type': 'application/json'
                  }
                }
              );

              const establishmentContent: any =
                await establishmentResponse.json();
              if (establishmentResponse.status !== 200) {
                throw establishmentContent.detail;
              }

              // Fetch group info if available
              let group: CeremaGroup | undefined;
              let perimeter: CeremaPerimeter | undefined;

              if (user.groupe) {
                group = await fetchPortailDF<CeremaGroup>(
                  token,
                  `/api/groupes/${user.groupe}/`
                ) ?? undefined;

                // Fetch perimeter if group has one
                if (group?.perimetre) {
                  perimeter = await fetchPortailDF<CeremaPerimeter>(
                    token,
                    `/api/perimetres/${group.perimetre}/`
                  ) ?? undefined;
                }
              }

              const u: CeremaUser = {
                email: user.email,
                establishmentSiren: establishmentContent.siret.substring(0, 9),
                hasAccount: true,
                // Check that acces_lovac is not null AND is a valid future date
                hasCommitment: isLovacAccessValid(
                  establishmentContent.acces_lovac
                ),
                group,
                perimeter
              };
              return u;
            }
          )
        );
        return users;
      }
      return [];
    } catch (error) {
      logger.error(error);
      return [];
    }
  }
}

export default function createCeremaService(): CeremaService {
  return new CeremaService();
}
