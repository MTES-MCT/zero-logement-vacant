import { mixed } from 'yup';

export function file(supportedFormats: string[]) {
  return mixed()
    .required('Veuillez sélectionner un fichier')
    .test(
      'fileType',
      'Format de fichier invalide',
      (value) => value && supportedFormats.includes(value.type),
    );
}
