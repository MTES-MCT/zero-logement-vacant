import { Establishment } from './Establishment';

type PartialEstablishment = Pick<
  Establishment,
  'id' | 'siren' | 'campaignIntent'
>;

export interface Prospect {
  email: string;
  establishment?: PartialEstablishment | null;
  hasAccount: boolean;
  hasCommitment: boolean;
}
