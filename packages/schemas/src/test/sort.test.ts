import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';

import { sort } from '../sort';

describe('sort schema', () => {
  test.prop({
    sort: fc.array(
      fc
        .string({ minLength: 1, maxLength: 12 })
        .filter((s) => /^-?[a-zA-Z]+$/.test(s))
    )
  })('accepts arrays of valid keys', ({ sort: input }) => {
    expect(sort.validateSync({ sort: input })).toEqual({ sort: input });
  });

  it('transforms a comma-separated string to an array', () => {
    expect(
      sort.validateSync({ sort: 'owner,-rawAddress' as unknown as string[] })
    ).toEqual({ sort: ['owner', '-rawAddress'] });
  });

  test.prop({
    bad: fc.string().filter((s) => s.length > 0 && !/^-?[a-zA-Z]+$/.test(s))
  })('rejects keys with invalid characters', ({ bad }) => {
    expect(() => sort.validateSync({ sort: [bad] })).toThrow();
  });
});
