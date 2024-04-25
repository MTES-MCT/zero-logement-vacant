import { CeremaUser, ConsultDossiersLovacService, ConsultUserService } from './consultUserService';

import fetch from 'node-fetch';
import config from '../../utils/config';
import { logger } from '../../utils/logger';

export class CeremaService implements ConsultDossiersLovacService, ConsultUserService {
  async consultDossiersLovac(): Promise<string[]> {
    try {
      const response = await fetch(
        `${config.cerema.api.endpoint}/api/consult/dossiers/lovac`,
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${config.cerema.api.authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const content = await response.json();

      if (response.status != 200) {
        throw content.detail;
      }

      if (content) {
        return content.filter((user: any) => user.status_lovac == 4).map(
          (user: any) => (user.mail)
        );
      }
      return [];
    } catch (error) {
      logger.error(error);
      return [];
    }
  }

  async consultUsers(email: string): Promise<CeremaUser[]> {
    try {
      const response = await fetch(
        `${config.cerema.api.endpoint}/api/consult/utilisateurs/?email=${email}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Token ${config.cerema.api.authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const content = await response.json();

      if (response.status != 200) {
        throw content.detail;
      }

      if (content) {
        return content.map(
          (user: { email: any; siret: string; lovac_ok: boolean }) => ({
            email: user.email,
            establishmentSiren: Number(user.siret.substring(0, 9)),
            hasAccount: true,
            hasCommitment: user.lovac_ok,
          })
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
