import {
  SirenSaintLo,
  SirenStrasbourg
} from '~/infra/database/seeds/development/20240404235442_establishments';

import {
  CeremaUser,
  ConsultUserService,
  getTestAccount
} from './consultUserService';

// Special SIREN that matches any establishment in tests
export const MOCK_ANY_SIREN = '*';

export class MockCeremaService implements ConsultUserService {
  async consultUsers(email: string): Promise<CeremaUser[]> {
    if (email === 'test.strasbourg@zlv.fr') {
      return [
        defaultOK(email, SirenStrasbourg),
        defaultOK(email, SirenSaintLo)
      ];
    }

    const testAccount = getTestAccount(email);
    if (testAccount) {
      return [testAccount];
    }
    // Return two entries: one with Strasbourg SIREN (for seed data) and one with wildcard (for any generated data)
    return [
      defaultOK(email, SirenStrasbourg),
      defaultOK(email, MOCK_ANY_SIREN)
    ];
  }
}

function defaultOK(email: string, siren: string): CeremaUser {
  return {
    email,
    establishmentSiren: siren,
    hasAccount: true,
    hasCommitment: true,
    cguValide: '2026-01-01T00:00:00.000Z',
    userExpiresAt: null,
    structureAccessExpiresAt: '2028-01-01T00:00:00.000Z',
    structureHasLovac: true,
    groupHasLovac: true,
    group: {
      id_groupe: 1,
      nom: 'Aucune restriction',
      structure: 1,
      perimetre: 1,
      niveau_acces: 'lovac',
      df_ano: false,
      df_non_ano: false,
      lovac: true
    },
    perimeter: {
      perimetre_id: 1,
      origine: 'mock',
      fr_entiere: false,
      reg: [],
      dep: [],
      epci: [siren],
      comm: []
    }
  };
}

export default function createMockCeremaService(): MockCeremaService {
  return new MockCeremaService();
}
