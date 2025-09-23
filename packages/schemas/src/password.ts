import { ref, string } from 'yup';

export const password = string()
  .min(12, 'Au moins 12 caractères.')
  .matches(/[A-Z]/g, {
    name: 'uppercase',
    message: 'Au moins une majuscule.'
  })
  .matches(/[a-z]/g, {
    name: 'lowercase',
    message: 'Au moins une minuscule.'
  })
  .matches(/[0-9]/g, {
    name: 'number',
    message: 'Au moins un chiffre.'
  });

/**
 * Yup validation for a password confirmation field.
 * @param key The key of the password field to match.
 * @returns A Yup schema for the password confirmation field.
 */
export const passwordConfirmation = (key = 'password') =>
  string()
    .required('Veuillez confirmer votre mot de passe.')
    .oneOf([ref(key)], 'Les mots de passe doivent être identiques.');
