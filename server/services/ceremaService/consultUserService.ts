import { ProspectApi } from '../../models/ProspectApi';

export interface ConsultUserService {
  consultUser(email: string): Promise<ProspectApi>;
}
