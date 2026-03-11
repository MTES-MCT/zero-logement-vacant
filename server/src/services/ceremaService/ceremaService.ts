import { CeremaUser, ConsultUserService } from './consultUserService';
import { createAuthProvider } from './ceremaAuthProvider';

import { logger } from '~/infra/logger';

export class CeremaService implements ConsultUserService {
  private authProvider = createAuthProvider();

  async consultUsers(email: string): Promise<CeremaUser[]> {
    try {
      const { token, authPrefix, apiUrl } =
        await this.authProvider.authenticate();

      const userResponse = await fetch(
        `${apiUrl}/api/utilisateurs?email=${email}`,
        {
          method: 'GET',
          headers: {
            Authorization: `${authPrefix} ${token}`,
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
                `${apiUrl}/api/structures/${user.structure}`,
                {
                  method: 'GET',
                  headers: {
                    Authorization: `${authPrefix} ${token}`,
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
                establishmentSiren: parseInt(
                  establishmentContent.siret.substring(0, 9)
                ),
                hasAccount: true,
                hasCommitment: establishmentContent.acces_lovac !== null
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
