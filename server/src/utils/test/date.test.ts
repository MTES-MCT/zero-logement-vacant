import { describe, expect, it } from 'vitest';

import { today } from '~/utils/date';

describe('today', () => {
  it('returns the current date as a yyyy-MM-dd string', () => {
    expect(today()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
