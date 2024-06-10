import { CeremaUser, ConsultUserService } from './consultUserService';
import { CeremaDossier, ConsultDossiersLovacService } from './consultDossiersLovacService';

import config from '~/infra/config';
import { logger } from '~/infra/logger';
import { ConsultStructureService, Structure } from './consultStructureService';

export class CeremaService implements ConsultDossiersLovacService, ConsultStructureService, ConsultUserService {
  async consultDossiersLovac(date: Date): Promise<CeremaDossier[]> {
    try {

      let uri = '/api/consult/dossiers/lovac';

      if(date !== null) {
        uri += `?date_min=${date}`;
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
  }

  async consultStructure(id: number): Promise<Structure> {
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
  }

  async consultUsers(email: string): Promise<CeremaUser[]> {
    try {
      const response = await fetch(
        `${config.cerema.api}/api/consult/utilisateurs/?email=${email}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${config.cerema.token}`,
            'Content-Type': 'application/json',
          },
        },
      );
      const content: any = await response.json();

      if (response.status !== 200) {
        throw content.detail;
      }

      if (content) {
        return content.map(
          (user: { email: any; siret: string; lovac_ok: boolean }) => ({
            email: user.email,
            establishmentSiren: Number(user.siret.substring(0, 9)),
            hasAccount: true,
            hasCommitment: user.lovac_ok,
          }),
        );
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
