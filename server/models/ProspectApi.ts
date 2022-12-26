import { v4 as uuidv4 } from 'uuid';
import { CampaignIntent } from './EstablishmentApi';

export interface ProspectApi {
  email: string;
  establishment?: {
    id?: string;
    siren: number;
    campaignIntent?: CampaignIntent;
  };
  hasAccount: boolean;
  hasCommitment: boolean;
}

export const TEST_ACCOUNTS: ReadonlyArray<ProspectApi> = [
  {
    email: 'ok@beta.gouv.fr',
    establishment: {
      id: uuidv4(),
      siren: 40429048,
    },
    hasAccount: true,
    hasCommitment: true,
  },
  {
    email: 'lovac_ko@beta.gouv.fr',
    establishment: {
      id: uuidv4(),
      siren: 785716885,
    },
    hasAccount: true,
    hasCommitment: false,
  },
  {
    email: 'account_ko@beta.gouv.fr',
    establishment: {
      id: uuidv4(),
      siren: 931547662,
    },
    hasAccount: false,
    hasCommitment: false,
  },
];

export function getTestAccount(email: string): ProspectApi | null {
  const testAccount = TEST_ACCOUNTS.find((account) => account.email === email);
  return testAccount ?? null;
}

export function isTestAccount(email: string): boolean {
  return getTestAccount(email) !== null;
}

export function isValid(prospect: ProspectApi): boolean {
  return prospect.hasAccount && prospect.hasCommitment;
}
