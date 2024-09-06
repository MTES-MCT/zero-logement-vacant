import { fc, test } from '@fast-check/jest';

import {
  SourceBuilding,
  sourceBuildingSchema
} from '~/scripts/import-lovac/source-buildings/source-building';

describe('SourceBuilding', () => {
  describe('sourceBuildingSchema', () => {
    test.prop<SourceBuilding>({
      building_id: fc.string({ minLength: 15, maxLength: 15 }),
      housing_vacant_count: fc.integer({ min: 0 }),
      housing_rent_count: fc.integer({ min: 0 })
    })('should validate a source building', (sourceBuilding) => {
      const actual = sourceBuildingSchema.validateSync(sourceBuilding);

      expect(actual).toStrictEqual(sourceBuilding);
    });
  });
});
