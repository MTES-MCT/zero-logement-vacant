import { CeremaUser, ConsultUserService } from './consultUserService';
import { CeremaDossier, ConsultDossiersLovacService } from './consultDossiersLovacService';

import config from '~/infra/config';
import { logger } from '~/infra/logger';
import { ConsultStructureService, Structure } from './consultStructureService';
import { format } from 'date-fns';

export class CeremaService implements ConsultDossiersLovacService, ConsultStructureService, ConsultUserService {
  /*async consultDossiersLovac(date: string | null): Promise<CeremaDossier[]> {
    try {

      let uri = '/api/consult/dossiers/lovac';

      if(date !== null) {
        uri += `?date_min=${format(date, 'yyyy-MM-dd')}`;
      }

      const response = await fetch(
        `${config.cerema.api}${uri}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${config.cerema.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const content: any = await response.json();

      if (response.status !== 200) {
        throw content.detail;
      }

      if (content) {
        return content.filter((dossier: any) => dossier.lovac).map(
          (dossier: any) => ({
            email: dossier.mail,
            establishmentId: dossier.id_structure,
          })
        );
      }
      return [];
    } catch (error) {
      logger.error(error);
      return [];
    }
  }*/

/*  async consultStructure(id: number): Promise<Structure> {
    try {
      const response = await fetch(
        `${config.cerema.api}/api/consult/structures/${id}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${config.cerema.token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const content: any = await response.json();

      if (response.status !== 200) {
        throw content.detail;
      }

      if (content) {
        const structure = content;
        return {
          establishmentId: structure.id_structure,
          siret: structure.siret,
          name: structure.raison_sociale,
          perimeter: structure.perimetre,
          kind: structure.formjur,
        };
      }
      throw new Error(`structure ${id} not found`);
    } catch (error) {
      logger.error(error);
      throw new Error(`structure ${id} not found`);
    }
  }*/

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
            console.log(establishmentContent);
            let u = {
              email: user.email,
              establishmentSiren: parseInt(establishmentContent.siret.substring(0, 9)),
              hasAccount: true,
              hasCommitment: establishmentContent.acces_lovac !== null
            }
            console.log(u)
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
