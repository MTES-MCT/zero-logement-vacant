import { EstablishmentApi } from './EstablishmentApi';

type PartialEstablishment = Pick<
  EstablishmentApi,
  'id' | 'siren' | 'campaignIntent'
>;

export interface ProspectApi {
  email: string;
  establishment?: PartialEstablishment | null;
  hasAccount: boolean;
  hasCommitment: boolean;
  lastAccountRequestAt: Date;
}

export function isValid(prospect: ProspectApi): boolean {
  return prospect.hasAccount && prospect.hasCommitment;
}
