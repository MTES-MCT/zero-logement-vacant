import { fc, test } from '@fast-check/vitest';
import type { UserFilters } from '@zerologementvacant/models';

import { userFilters } from '../user-filters';

describe('User filters', () => {
  test.prop<UserFilters>({
    establishments: fc.array(fc.uuid({ version: 4 }))
  })(`should validate inputs`, (payload) => {
    const validate = () => userFilters.validateSync(payload);

    expect(validate).not.toThrow();
  });
});
