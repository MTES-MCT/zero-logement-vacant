import { fc, test } from '@fast-check/vitest';
import { describe, expect, it } from 'vitest';

import { MAX_PER_PAGE, pagination } from '../pagination';

describe('pagination schema', () => {
  test.prop({
    paginate: fc.boolean(),
    page: fc.integer({ min: 1, max: 10_000 }),
    perPage: fc.integer({ min: 1, max: MAX_PER_PAGE })
  })('accepts valid inputs', (input) => {
    expect(pagination.validateSync(input)).toEqual(input);
  });

  test.prop({
    page: fc.integer({ max: 0 })
  })('rejects page < 1', ({ page }) => {
    expect(() => pagination.validateSync({ page })).toThrow();
  });

  test.prop({
    perPage: fc.integer({ min: MAX_PER_PAGE + 1, max: MAX_PER_PAGE + 10_000 })
  })('rejects perPage > MAX_PER_PAGE', ({ perPage }) => {
    expect(() => pagination.validateSync({ perPage })).toThrow();
  });

  it('applies defaults when no input is provided', () => {
    expect(pagination.validateSync({})).toEqual({
      paginate: true,
      page: 1,
      perPage: 50
    });
  });
});
