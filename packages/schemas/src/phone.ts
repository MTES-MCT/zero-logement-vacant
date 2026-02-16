import { string } from 'yup';

/**
 * Matches French phone numbers in two formats:
 * - International: +33XXXXXXXXX (12 characters total)
 * - Local: 0XXXXXXXXX (10 digits starting with 0)
 *
 * The second digit must be 1-9 (not 0).
 * @example +33123456789
 * @example 0612345678
 */
export const PHONE_REGEXP = /^(\+33|0)[1-9][0-9]{8}$/;

export const phone = string()
  .trim()
  .matches(PHONE_REGEXP, {
    message:
      'Numéro de téléphone invalide. Formats valides : +33XXXXXXXXX ou 0XXXXXXXXX',
    excludeEmptyString: true
  });
