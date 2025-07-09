import { fc, test } from '@fast-check/vitest';
import { BuildingFiltersDTO } from '@zerologementvacant/models';
import { buildingFilters } from '../building-filters';

describe('Building filters', () => {
  test.prop<BuildingFiltersDTO>({
    id: fc.option(fc.array(fc.uuid({ version: 4 })), { nil: undefined })
  })('should validate inputs', (filters) => {
    const validate = () => buildingFilters.validateSync(filters);

    expect(validate).not.toThrow();
  });
});
