import {
  CeremaUser,
  ConsultUserService,
  getTestAccount
} from './consultUserService';

import { SirenStrasbourg } from '~/infra/database/seeds/development/20240404235442_establishments';

// Special SIREN that matches any establishment in tests
export const MOCK_ANY_SIREN = '*';

export class MockCeremaService implements ConsultUserService {
  async consultUsers(email: string): Promise<CeremaUser[]> {
    const testAccount = getTestAccount(email);
    if (testAccount) {
      return [testAccount];
    }
    // Return two entries: one with Strasbourg SIREN (for seed data) and one with wildcard (for any generated data)
    return [defaultOK(email, SirenStrasbourg), defaultOK(email, MOCK_ANY_SIREN)];
  }
}

function defaultOK(email: string, siren: string): CeremaUser {
  return {
    email,
    establishmentSiren: siren,
    hasAccount: true,
    hasCommitment: true
  };
}

export default function createMockCeremaService(): MockCeremaService {
  return new MockCeremaService();
}
