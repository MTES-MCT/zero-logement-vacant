import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';

import { campaignFilters } from '../campaign-filters';

describe('campaignFilters schema', () => {
  test.prop({
    groups: fc.array(fc.uuid({ version: 4 }))
  })('accepts arrays of UUIDs', ({ groups }) => {
    expect(campaignFilters.validateSync({ groups })).toEqual({ groups });
  });

  it('transforms a comma-separated string to an array', () => {
    const uuid1 = '00000000-0000-4000-8000-000000000001';
    const uuid2 = '00000000-0000-4000-8000-000000000002';
    expect(
      campaignFilters.validateSync({
        groups: `${uuid1},${uuid2}` as unknown as string[]
      })
    ).toEqual({ groups: [uuid1, uuid2] });
  });

  it('accepts an empty input (groups is optional)', () => {
    expect(campaignFilters.validateSync({})).toEqual({});
  });

  test.prop({
    bad: fc.string().filter((s) => s.length > 0 && !/^[0-9a-fA-F-]+$/.test(s))
  })('rejects non-UUID entries', ({ bad }) => {
    expect(() => campaignFilters.validateSync({ groups: [bad] })).toThrow();
  });
});
