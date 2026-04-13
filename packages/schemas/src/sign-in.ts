import { object, string } from 'yup';

export const signIn = object({
  email: string().trim().email().required(),
  password: string().trim().required(),
  establishmentId: string().optional().nullable().default(null)
});
