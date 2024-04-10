import { ref, string } from 'yup';

export const password = string()
  .min(8, 'Au moins 8 caractères.')
  .matches(/[A-Z]/g, {
    name: 'uppercase',
    message: 'Au moins une majuscule.',
  })
  .matches(/[a-z]/g, {
    name: 'lowercase',
    message: 'Au moins une minuscule.',
  })
  .matches(/[0-9]/g, {
    name: 'number',
    message: 'Au moins un chiffre.',
  });

export const passwordConfirmation = string()
  .required('Veuillez confirmer votre mot de passe.')
  .oneOf([ref('password')], 'Les mots de passe doivent être identiques.');
