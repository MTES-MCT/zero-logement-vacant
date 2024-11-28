import { string } from 'yup';

export const SIREN_REGEXP = /^[0-9]{9}$/;

export const siren = string().trim().length(9).matches(SIREN_REGEXP);
