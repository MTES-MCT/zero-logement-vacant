import {
  CeremaUser,
  ConsultUserService,
  getTestAccount,
} from './consultUserService';
import { SirenStrasbourg } from '../../../database/seeds/dummy/001-establishments';

class MockCeremaService implements ConsultUserService {
  async consultUsers(email: string): Promise<CeremaUser[]> {
    const testAccount = getTestAccount(email);
    return [testAccount ?? defaultOK(email)];
  }
}

function defaultOK(email: string): CeremaUser {
  return {
    email,
    establishmentSiren: Number(SirenStrasbourg),
    hasAccount: true,
    hasCommitment: true,
  };
}

export default function createMockCeremaService(): ConsultUserService {
  return new MockCeremaService();
}
