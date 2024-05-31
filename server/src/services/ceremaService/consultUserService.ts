import { Establishment1 } from '~/infra/database/seeds/test/20240405011849_establishments';

export interface CeremaUser {
  email: string;
  establishmentSiren: number;
  hasAccount: boolean;
  hasCommitment: boolean;
}

export const TEST_ACCOUNTS: ReadonlyArray<CeremaUser> = [
  {
    email: 'ok@beta.gouv.fr',
    establishmentSiren: Establishment1.siren,
    hasAccount: true,
    hasCommitment: true,

  },
  {
    email: 'lovac_ko@beta.gouv.fr',
    establishmentSiren: Establishment1.siren,
    hasAccount: true,
    hasCommitment: false,
  },
  {
    email: 'account_ko@beta.gouv.fr',
    establishmentSiren: Establishment1.siren,
    hasAccount: false,
    hasCommitment: false,
  },
];

export const getTestEmails = (): string[] => {
  return TEST_ACCOUNTS.map(user => user.email);
}

export const getTestAccount = (email: string): CeremaUser | null => {
  const testAccount = TEST_ACCOUNTS.find((account) => account.email === email);
  return testAccount ?? null;
};

export const isTestAccount = (email: string): boolean => {
  return getTestAccount(email) !== null;
};

export interface ConsultUserService {
  consultUsers(email: string): Promise<CeremaUser[]>;
}
