import {
  TIME_PER_WEEK_VALUES,
  type UserUpdatePayload
} from '@zerologementvacant/models';
import { object, string, type ObjectSchema } from 'yup';

export const userUpdatePayload: ObjectSchema<UserUpdatePayload> = object({
  firstName: string().trim().nullable().optional().default(null),
  lastName: string().trim().nullable().optional().default(null),
  phone: string().trim().nullable().optional().default(null),
  position: string().trim().nullable().optional().default(null),
  timePerWeek: string()
    .oneOf(TIME_PER_WEEK_VALUES)
    .nullable()
    .optional()
    .default(null)
});
