import {
  CeremaUser,
  ConsultUserService,
  getTestAccount
} from './consultUserService';

import { SirenStrasbourg } from '~/infra/database/seeds/development/20240404235442_establishments';

export class MockCeremaService implements ConsultUserService {
  async consultUsers(email: string): Promise<CeremaUser[]> {
    const testAccount = getTestAccount(email);
    return [testAccount ?? defaultOK(email)];
  }
}

function defaultOK(email: string): CeremaUser {
  return {
    email,
    establishmentSiren: SirenStrasbourg,
    hasAccount: true,
    hasCommitment: true,
    cguValid: true,
    isValid: true,
  };
}

export default function createMockCeremaService(): MockCeremaService {
  return new MockCeremaService();
}
