import { object, string } from 'yup';

export const documentPayload = object({
  filename: string()
    .required()
    .trim()
    .max(255, 'Le nom du document doit faire moins de 255 caractères.')
}).required();
