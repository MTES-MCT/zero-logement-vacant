import { fc, test } from '@fast-check/jest';

import {
  HOUSING_KIND_VALUES,
  OCCUPANCY_VALUES,
  OWNERSHIP_KIND_INTERNAL_VALUES
} from '@zerologementvacant/models';
import {
  SourceHousing,
  sourceHousingSchema
} from '~/scripts/import-lovac/source-housings/source-housing';

describe('SourceHousing', () => {
  describe('sourceHousingSchema', () => {
    test.prop<SourceHousing>({
      data_file_year: fc.constant('lovac-2025'),
      invariant: fc.string({ minLength: 1, maxLength: 20 }),
      local_id: fc.string({ minLength: 12, maxLength: 12 }),
      building_id: fc.option(fc.string({ minLength: 15, maxLength: 15 })),
      building_location: fc.option(fc.string({ minLength: 1 })),
      building_year: fc.option(
        fc.integer({ min: 1, max: new Date().getUTCFullYear() })
      ),
      plot_id: fc.option(fc.string({ minLength: 1 })),
      geo_code: fc.string({ minLength: 5, maxLength: 5 }),
      ban_id: fc.option(fc.string({ minLength: 1 })),
      ban_label: fc.option(fc.string({ minLength: 1 })),
      ban_score: fc.option(fc.float({ min: 0, max: 1, noNaN: true })),
      ban_latitude: fc.option(fc.float({ min: -90, max: 90, noNaN: true })),
      ban_longitude: fc.option(fc.float({ min: -180, max: 180, noNaN: true })),
      dgfip_address: fc.string({ minLength: 1 }),
      dgfip_latitude: fc.option(fc.float({ min: -90, max: 90, noNaN: true })),
      dgfip_longitude: fc.option(
        fc.float({ min: -180, max: 180, noNaN: true })
      ),
      housing_kind: fc.constantFrom(...HOUSING_KIND_VALUES),
      condominium: fc.option(
        fc.constantFrom(...OWNERSHIP_KIND_INTERNAL_VALUES)
      ),
      living_area: fc.option(fc.integer({ min: 1 })),
      rooms_count: fc.option(fc.integer({ min: 0 })),
      uncomfortable: fc.boolean(),
      cadastral_classification: fc.option(fc.integer({ min: 0 })),
      cadastral_reference: fc.option(fc.string({ minLength: 6, maxLength: 6 })),
      taxed: fc.boolean(),
      rental_value: fc.option(fc.integer({ min: 0 })),
      occupancy_source: fc.constantFrom(...OCCUPANCY_VALUES),
      vacancy_start_year: fc.integer({
        min: 1,
        max: new Date().getUTCFullYear()
      }),
      mutation_date: fc.option(fc.date()),
      last_mutation_date: fc.option(fc.date()),
      last_transaction_date: fc.option(fc.date()),
      last_transaction_value: fc.option(fc.integer({ min: 1 }))
    })('should validate a source housing', (sourceHousing) => {
      const actual = sourceHousingSchema.validateSync(sourceHousing);

      expect(actual).toStrictEqual(sourceHousing);
    });
  });
});
