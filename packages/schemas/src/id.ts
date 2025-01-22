import { string } from 'yup';

export const id = string().uuid().required();
