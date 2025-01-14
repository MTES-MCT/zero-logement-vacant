import EstablishmentMissingError from '~/errors/establishmentMissingError';
import { ConsultUserService } from './consultUserService';
import { CeremaUser } from '@zerologementvacant/models';

import config from '~/infra/config';
import { logger } from '~/infra/logger';
import establishmentRepository from '~/repositories/establishmentRepository';

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

            // TODO vérifier les droits au niveau structure

            const establishmentContent: any = await establishmentResponse.json();
            if (establishmentResponse.status !== 200) {
              throw establishmentContent.detail;
            }

            const permissionResponse = await fetch(
              `${config.cerema.api}/api/permissions?email=${email}`,
              {
                method: 'GET',
                headers: {
                  Authorization: `Token ${token}`,
                  'Content-Type': 'application/json',
                },
              },
            );

            const permissionContent: any = await permissionResponse.json();
            if (permissionResponse.status !== 200) {
              throw permissionContent.detail;
            }

            let siren;
            try {
              siren = establishmentContent.siret.substring(0, 9);
            } catch {
                throw new EstablishmentMissingError(establishmentContent.id_structure);
            }

            const establishment = await establishmentRepository.findOne({siren: Number(siren)});
            if(establishment === null) {
              throw new EstablishmentMissingError(siren);
            }
            const franceEntiere = establishment.geoCodes.length === 0;
            const hasCommitment = franceEntiere ? permissionContent.lovac.fr_entiere : establishment.geoCodes.every(element => permissionContent.lovac.comm.includes(element));
            const cguValid = permissionContent.cgu_valide !== null;

            return {
              email: user.email,
              establishmentSiren: siren,
              hasAccount: true,
              hasCommitment,
              cguValid,
              isValid: cguValid && hasCommitment,
            };
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
