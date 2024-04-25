import {
  CeremaUser,
  ConsultDossiersLovacService,
  ConsultUserService,
  getTestAccount,
  getTestEmails,
} from './consultUserService';
import { SirenStrasbourg } from '../../../database/seeds/dummy/001-establishments';

export class MockCeremaService implements ConsultDossiersLovacService, ConsultUserService {

  async consultDossiersLovac(): Promise<string[]> {
    return getTestEmails();
  }

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

export default function createMockCeremaService(): MockCeremaService {
  return new MockCeremaService();
}
