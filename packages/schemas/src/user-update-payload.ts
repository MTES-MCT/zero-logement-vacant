import {
  TIME_PER_WEEK_VALUES,
  type UserUpdatePayload
} from '@zerologementvacant/models';
import { object, string, type ObjectSchema } from 'yup';

import { password } from './password';
import { phone } from './phone';

export const userUpdatePayload: ObjectSchema<UserUpdatePayload> = object({
  firstName: string().trim().nullable().optional().default(null),
  lastName: string().trim().nullable().optional().default(null),
  phone: phone.nullable().optional().default(null),
  position: string().trim().nullable().optional().default(null),
  timePerWeek: string()
    .oneOf(TIME_PER_WEEK_VALUES)
    .nullable()
    .optional()
    .default(null),
  password: object({
    before: string().required('Le mot de passe actuel est requis.'),
    after: password.required('Le nouveau mot de passe est requis.')
  })
    .optional()
    .default(undefined)
});
