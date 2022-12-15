export interface Prospect {
  email: string;
  establishment?: {
    id: string;
    siren: number;
    campaignIntent?: string;
  };
  hasAccount: boolean;
  hasCommitment: boolean;
}
