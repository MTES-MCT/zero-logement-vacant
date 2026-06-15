import { array, mixed, object, string } from 'yup';

const banIdMessage =
  "L'adresse BAN doit avoir un identifiant BAN. Veuillez sélectionner une adresse depuis la liste de suggestions.";
const labelMessage =
  "L'adresse BAN doit avoir un libellé. Veuillez sélectionner une adresse depuis la liste de suggestions.";
const postalCodeMessage =
  "L'adresse BAN doit avoir un code postal. Veuillez sélectionner une adresse depuis la liste de suggestions.";
const cityMessage =
  "L'adresse BAN doit avoir une ville. Veuillez sélectionner une adresse depuis la liste de suggestions.";

// `banAddress` uses `mixed()` rather than `object().shape({...})` so that the full
// `AddressDTO` shape (latitude, longitude, houseNumber, …) passes through untouched
// instead of being stripped by validator-next's `stripUnknown: true`. The custom test
// replicates the legacy express-validator `.custom()` check faithfully, including the
// French error messages on each missing field.
export const ownerPayload = object({
  fullName: string().required(),
  birthDate: string().nullable().notRequired(),
  rawAddress: array().of(string().required()).nullable().notRequired(),
  email: string()
    // Mirror legacy `optional({ checkFalsy: true })`: empty string is treated as absent.
    .transform((value) => (value === '' ? undefined : value))
    .email()
    .nullable()
    .notRequired(),
  phone: string().nullable().notRequired(),
  banAddress: mixed()
    .nullable()
    .notRequired()
    .test({
      name: 'ban-address-shape',
      test(value) {
        if (value === null || value === undefined) {
          return true;
        }
        if (typeof value !== 'object') {
          return this.createError({ message: banIdMessage });
        }
        const address = value as Record<string, unknown>;
        const requireString = (
          key: string,
          message: string
        ): true | ReturnType<typeof this.createError> => {
          const fieldValue = address[key];
          if (typeof fieldValue !== 'string' || fieldValue.trim() === '') {
            return this.createError({ message });
          }
          return true;
        };
        const checks: ReadonlyArray<[string, string]> = [
          ['banId', banIdMessage],
          ['label', labelMessage],
          ['postalCode', postalCodeMessage],
          ['city', cityMessage]
        ];
        for (const [key, message] of checks) {
          const result = requireString(key, message);
          if (result !== true) {
            return result;
          }
        }
        return true;
      }
    }),
  additionalAddress: string().nullable().notRequired()
});
