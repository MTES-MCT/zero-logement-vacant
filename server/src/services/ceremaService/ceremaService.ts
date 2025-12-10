import { CeremaUser, ConsultUserService } from './consultUserService';

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
            async (user: { email: any; structure: number }) => {
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

              const u = {
                email: user.email,
                establishmentSiren: establishmentContent.siret.substring(0, 9),
                hasAccount: true,
                // Check that acces_lovac is not null AND is a valid future date
                hasCommitment: isLovacAccessValid(
                  establishmentContent.acces_lovac
                )
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
