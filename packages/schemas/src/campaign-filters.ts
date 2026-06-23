import { array, object, string } from 'yup';

export const campaignFilters = object({
  groups: array()
    .transform((value) =>
      typeof value === 'string' ? value.split(',') : value
    )
    .of(string().uuid().required())
    .optional()
});
