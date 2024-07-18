import {
  CeremaUser,
  ConsultUserService,
  getTestAccount
} from './consultUserService';

import { CeremaDossier, ConsultDossiersLovacService, getTestDossiers } from './consultDossiersLovacService';

import { SirenStrasbourg } from '~/infra/database/seeds/development/20240404235442_establishments';
import { ConsultStructureService, getTestStructure, Structure } from './consultStructureService';

export class MockCeremaService implements ConsultDossiersLovacService, ConsultStructureService, ConsultUserService {

  consultStructure(id: number): Promise<Structure> {
    return new Promise((resolve) => resolve(getTestStructure(id)));
  }

  async consultDossiersLovac(): Promise<CeremaDossier[]> {
    return getTestDossiers();
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
