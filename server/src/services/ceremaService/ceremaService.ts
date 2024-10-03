import { CeremaUser, ConsultUserService } from './consultUserService';

import config from '~/infra/config';
import { logger } from '~/infra/logger';

export class CeremaService implements ConsultUserService {

  async consultUsers(email: string): Promise<CeremaUser[]> {
    try {

      const authResponse = await fetch(
        `${config.cerema.api}/api/api-token-auth/`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: config.cerema.username,
            password: config.cerema.password,
          }),
        }
      );
      const { token }: any = await authResponse.json();
      const userResponse = await fetch(
        `${config.cerema.api}/api/utilisateurs?email=${email}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const userContent: any = await userResponse.json();
      if (userResponse.status !== 200) {
        throw userContent.detail;
      }

      if (userContent) {
        const users = await Promise.all(userContent.results.map(
          async (user: { email: any; structure: number; }) => {
            const establishmentResponse = await fetch(
              `${config.cerema.api}/api/structures/${user.structure}`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Token ${token}`,
                  'Content-Type': 'application/json',
                },
              },
            );
            
            const establishmentContent: any = await establishmentResponse.json();
            if (establishmentResponse.status !== 200) {
              throw establishmentContent.detail;
            }

            let u = {
              email: user.email,
              establishmentSiren: parseInt(establishmentContent.siret.substring(0, 9)),
              hasAccount: true,
              hasCommitment: establishmentContent.acces_lovac !== null
            }
            return u;
        }));
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
