import { EstablishmentDTO } from './EstablishmentDTO';

export interface ProspectDTO {
  email: string;
  establishment?: Pick<EstablishmentDTO, 'id' | 'siren'>;
  hasAccount: boolean;
  hasCommitment: boolean;
}
