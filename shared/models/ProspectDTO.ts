import { EstablishmentDTO } from './EstablishmentDTO';

export interface ProspectDTO {
  email: string;
  establishment?: PartialEstablishment | null;
  hasAccount: boolean;
  hasCommitment: boolean;
}

type PartialEstablishment = Pick<
  EstablishmentDTO,
  'id' | 'siren' | 'campaignIntent'
>;

export function isValid(prospect: ProspectDTO): boolean {
  return prospect.hasAccount && prospect.hasCommitment;
}
