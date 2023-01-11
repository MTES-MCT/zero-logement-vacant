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
}

export const TEST_ACCOUNTS: ReadonlyArray<ProspectApi> = [
  {
    email: 'ok@beta.gouv.fr',
    hasAccount: true,
    hasCommitment: true,
  },
  {
    email: 'lovac_ko@beta.gouv.fr',
    hasAccount: true,
    hasCommitment: false,
  },
  {
    email: 'account_ko@beta.gouv.fr',
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
