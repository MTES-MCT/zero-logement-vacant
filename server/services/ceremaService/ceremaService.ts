import { CeremaUser, ConsultUserService } from './consultUserService';
import fetch from 'node-fetch';
import config from '../../utils/config';

class CeremaService implements ConsultUserService {
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
      const users = await response.json();
      if (users) {
        return users.map(
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
      console.error(error);
      return [];
    }
  }
}

export default function createCeremaService(): ConsultUserService {
  return new CeremaService();
}
