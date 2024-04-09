import { string } from 'yup';

export const email = string()
  .required('Veuillez renseigner votre adresse email.')
  .email("L'adresse doit être un email valide");
