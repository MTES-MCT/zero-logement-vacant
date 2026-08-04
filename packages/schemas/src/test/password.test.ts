import { fc, test } from '@fast-check/vitest';

import { password } from '../password';

const uppercase = fc.constantFrom(...'ABCDEFGHIJKLMNOPQRSTUVWXYZ');
const lowercase = fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz');
const digit = fc.constantFrom(...'0123456789');
const alphanumeric = fc.constantFrom(
  ...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
);

const validAlphanumericPassword = fc
  .tuple(
    uppercase,
    lowercase,
    digit,
    fc.array(alphanumeric, { minLength: 9, maxLength: 50 })
  )
  .map(([upper, lower, number, rest]) =>
    [upper, lower, number, ...rest].join('')
  );

describe('password', () => {
  test.prop([validAlphanumericPassword])(
    'should accept passwords without special characters',
    (input) => {
      expect(() => password.required().validateSync(input)).not.toThrow();
    }
  );
});
