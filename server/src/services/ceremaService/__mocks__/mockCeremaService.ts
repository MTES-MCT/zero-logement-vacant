import { CeremaUser } from '@zerologementvacant/models';
import { ConsultUserService } from '../consultUserService';
import { Establishment1 } from '~/infra/database/seeds/test/20240405011849_establishments';

class MockCeremaService implements ConsultUserService {

  async consultUsers(email: string): Promise<CeremaUser[]> {
    return [
      {
        email,
        establishmentSiren: Establishment1.siren,
        establishmentId: Establishment1.id,
        hasAccount: true,
        hasCommitment: true,
        cguValid: true,
        isValid: true,
      },
    ];
  }
}

export default function createMockCeremaService(): ConsultUserService {
  return new MockCeremaService();
}
