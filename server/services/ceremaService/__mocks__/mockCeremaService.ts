import { CeremaUser, ConsultUserService } from '../consultUserService';
import { Establishment1 } from '../../../../database/seeds/test/001-establishments';

class MockCeremaService implements ConsultUserService {

  async consultUsers(email: string): Promise<CeremaUser[]> {
    return [
      {
        email,
        establishmentSiren: Establishment1.siren,
        hasAccount: true,
        hasCommitment: true,
      },
    ];
  }
}

export default function createMockCeremaService(): ConsultUserService {
  return new MockCeremaService();
}
