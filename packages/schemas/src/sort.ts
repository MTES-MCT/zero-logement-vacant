import { array, object, string } from 'yup';

export const sort = object({
  sort: array()
    .transform((value) =>
      typeof value === 'string' ? value.split(',') : value
    )
    .of(
      string().test({
        name: 'comma-separated values',
        test(value) {
          return value ? /^-?[a-zA-Z]+$/i.test(value) : true;
        }
      })
    )
});
