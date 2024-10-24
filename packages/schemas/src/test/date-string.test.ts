import { fc, test } from '@fast-check/jest';

import { DATE_LENGTH, dateString } from '../date-string';

describe('Date string', () => {
  test.prop<[string]>([
    fc
      .date({
        min: new Date('0001-01-01'),
        max: new Date('9999-12-31')
      })
      .map((date) => date.toISOString().substring(0, DATE_LENGTH))
  ])('should validate input', (value) => {
    const actual = dateString.isValidSync(value);

    expect(actual).toBeTrue();
  });
});
