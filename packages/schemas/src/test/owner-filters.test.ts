import { fc, test } from '@fast-check/vitest';
import type { OwnerFiltersDTO } from '@zerologementvacant/models';

import { ownerFilters } from '../owner-filters';

describe('Owner filters', () => {
  test.prop<OwnerFiltersDTO>({
    search: fc.option(fc.stringMatching(/^\w+$/), { nil: undefined }),
    idpersonne: fc.option(fc.oneof(fc.boolean(), fc.array(fc.string())), {
      nil: undefined
    })
  })('should validate inputs', (filters) => {
    const validate = () => ownerFilters.validateSync(filters);

    expect(validate).not.toThrow();
  });
});
