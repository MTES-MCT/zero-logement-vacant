import { ConsultUserService } from '../consultUserService';
import { ProspectApi } from '../../../models/ProspectApi';
import { Establishment1 } from '../../../../database/seeds/test/001-establishments';

class MockCeremaService implements ConsultUserService {
  async consultUser(email: string): Promise<ProspectApi> {
    return {
      email,
      establishment: Establishment1,
      hasAccount: true,
      hasCommitment: true,
    };
  }
}

export default function createMockCeremaService(): ConsultUserService {
  return new MockCeremaService();
}
