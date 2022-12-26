import { v4 as uuidv4 } from 'uuid';
import { ConsultUserService } from './consultUserService';
import { getTestAccount, ProspectApi } from '../../models/ProspectApi';
import { SirenStrasbourg } from '../../../database/seeds/dummy/001-establishments';

class MockCeremaService implements ConsultUserService {
  async consultUser(email: string): Promise<ProspectApi> {
    const testAccount = getTestAccount(email);
    return testAccount ?? defaultOK(email);
  }
}

function defaultOK(email: string): ProspectApi {
  return {
    email,
    establishment: {
      id: uuidv4(),
      siren: Number(SirenStrasbourg),
    },
    hasAccount: true,
    hasCommitment: true,
  };
}

export default function createMockCeremaService(): ConsultUserService {
  return new MockCeremaService();
}
