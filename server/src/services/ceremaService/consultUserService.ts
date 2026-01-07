import { Establishment1 } from '~/infra/database/seeds/test/20240405011849_establishments';

/**
 * Portail DF perimeter definition
 * Defines the geographic scope of user access
 */
export interface CeremaPerimeter {
  perimetre_id: number;
  origine: string;
  fr_entiere: boolean;
  reg: string[];  // Region codes
  dep: string[];  // Department codes (2-3 chars)
  epci: string[]; // EPCI SIREN codes (9 chars)
  comm: string[]; // Commune INSEE codes (5 chars)
}

/**
 * Portail DF group definition
 * Defines user access level and perimeter
 */
export interface CeremaGroup {
  id_groupe: number;
  nom: string;
  structure: number;
  perimetre: number;
  niveau_acces: string; // 'lovac', 'df', etc.
  df_ano: boolean;
  df_non_ano: boolean;
  lovac: boolean;
}

export interface CeremaUser {
  email: string;
  establishmentSiren: string;
  hasAccount: boolean;
  hasCommitment: boolean;
  /** User's group info from Portail DF */
  group?: CeremaGroup;
  /** User's perimeter info from Portail DF */
  perimeter?: CeremaPerimeter;
}

export const TEST_ACCOUNTS: ReadonlyArray<CeremaUser> = [
  {
    email: 'ok@beta.gouv.fr',
    establishmentSiren: Establishment1.siren,
    hasAccount: true,
    hasCommitment: true
  },
  {
    email: 'lovac_ko@beta.gouv.fr',
    establishmentSiren: Establishment1.siren,
    hasAccount: true,
    hasCommitment: false
  },
  {
    email: 'account_ko@beta.gouv.fr',
    establishmentSiren: Establishment1.siren,
    hasAccount: false,
    hasCommitment: false
  }
];

export const getTestEmails = (): string[] => {
  return TEST_ACCOUNTS.map((user) => user.email);
};

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
