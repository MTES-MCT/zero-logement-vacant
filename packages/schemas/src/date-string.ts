import { string } from 'yup';

export const ISO8601_DATE_REGEXP = /^\d{4}-\d{2}-\d{2}$/;
export const DATE_LENGTH = 'yyyy-mm-dd'.length;

export const dateString = string()
  .trim()
  .length(DATE_LENGTH)
  .test({
    name: 'is-iso-date',
    skipAbsent: true,
    exclusive: true,
    message: 'Veuillez renseigner une date valide.',
    test(value: string | undefined, { createError }) {
      if (value) {
        if (!ISO8601_DATE_REGEXP.test(value)) {
          return createError({
            message: 'La date doit être au format yyyy-mm-dd.'
          });
        }

        const date = new Date(value);
        const timestamp = date.getTime();
        if (Number.isNaN(timestamp)) {
          return createError({
            message: 'Veuillez renseigner une date valide.'
          });
        }
      }

      return true;
    }
  });
