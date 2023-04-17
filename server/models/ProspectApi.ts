import { EstablishmentApi } from './EstablishmentApi';
import { Establishment1 } from '../../database/seeds/test/001-establishments';

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

export const TEST_ACCOUNTS: ReadonlyArray<
  ProspectApi & { establishmentSiren: number }
> = [
  {
    email: 'ok@beta.gouv.fr',
    establishment: Establishment1,
    establishmentSiren: Establishment1.siren,
    hasAccount: true,
    hasCommitment: true,
  },
  {
    email: 'lovac_ko@beta.gouv.fr',
    establishment: Establishment1,
    establishmentSiren: Establishment1.siren,
    hasAccount: true,
    hasCommitment: false,
  },
  {
    email: 'account_ko@beta.gouv.fr',
    establishment: Establishment1,
    establishmentSiren: Establishment1.siren,
    hasAccount: false,
    hasCommitment: false,
  },
];

export function getTestAccount(
  email: string
): (ProspectApi & { establishmentSiren: number }) | null {
  const testAccount = TEST_ACCOUNTS.find((account) => account.email === email);
  return testAccount ?? null;
}

export function isTestAccount(email: string): boolean {
  return getTestAccount(email) !== null;
}

export function isValid(prospect: ProspectApi): boolean {
  return prospect.hasAccount && prospect.hasCommitment;
}
