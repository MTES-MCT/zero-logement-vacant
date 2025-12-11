import { object, string } from 'yup';

export const documentPayload = object({
  filename: string().required()
}).required();
