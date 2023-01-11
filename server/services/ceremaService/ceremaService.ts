import { CeremaUser, ConsultUserService } from './consultUserService';
import fetch from 'node-fetch';
import config from '../../utils/config';

class CeremaService implements ConsultUserService {
  async consultUser(email: string): Promise<CeremaUser> {
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
      if (users.length) {
        return {
          email: users[0].email,
          establishmentSiren: Number(users[0].siret.substring(0, 9)),
          hasAccount: true,
          hasCommitment: users[0].lovac_ok,
        };
      }
      return defaultUser(email);
    } catch (error) {
      console.error(error);
      return defaultUser(email);
    }
  }
}

function defaultUser(email: string): CeremaUser {
  return {
    email,
    hasAccount: false,
    hasCommitment: false,
  };
}

export default function createCeremaService(): ConsultUserService {
  return new CeremaService();
}
