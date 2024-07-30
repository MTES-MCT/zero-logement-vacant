import { fc, test } from '@fast-check/jest';

import { HOUSING_KIND_VALUES } from '@zerologementvacant/models';
import {
  SourceHousing,
  sourceHousingSchema
} from '~/scripts/import-lovac/source-housings/source-housing';

describe('SourceHousing', () => {
  describe('sourceHousingSchema', () => {
    test.prop<SourceHousing>({
      data_file_years: fc.constant('lovac-2024'),
      data_source: fc.constant('lovac'),
      local_id: fc.string({ minLength: 12, maxLength: 12 }),
      building_id: fc.string({ minLength: 15, maxLength: 15 }),
      plot_id: fc.string({ minLength: 1 }),
      location_detail: fc.string({ minLength: 1 }),
      geo_code: fc.string({ minLength: 5, maxLength: 5 }),
      ban_address: fc.option(fc.string({ minLength: 1 })),
      ban_score: fc.option(fc.float({ min: 0, max: 1, noNaN: true })),
      ban_latitude: fc.option(fc.float({ min: -90, max: 90, noNaN: true })),
      ban_longitude: fc.option(fc.float({ min: -180, max: 180, noNaN: true })),
      geolocalisation: fc.string({ minLength: 1 }),
      dgfip_address: fc.string({ minLength: 1 }),
      dgfip_latitude: fc.option(fc.float({ min: -90, max: 90, noNaN: true })),
      dgfip_longitude: fc.option(
        fc.float({ min: -180, max: 180, noNaN: true })
      ),
      housing_kind: fc.constantFrom(...HOUSING_KIND_VALUES),
      condominium: fc.option(fc.string({ minLength: 1 })),
      living_area: fc.float({ min: 0, noNaN: true }),
      rooms_count: fc.integer({ min: 0 }),
      building_year: fc.option(
        fc.integer({ min: 1, max: new Date().getUTCFullYear() })
      ),
      uncomfortable: fc.boolean(),
      cadastral_classification: fc.integer({ min: 0 }),
      beneficiary_count: fc.integer({ min: 1 }),
      taxed: fc.boolean(),
      vacancy_start_year: fc.integer({
        min: 1,
        max: new Date().getUTCFullYear()
      }),
      mutation_date: fc.option(fc.date())
    })('should validate a source housing', (sourceHousing) => {
      const actual = sourceHousingSchema.validateSync(sourceHousing);

      expect(actual).toStrictEqual(sourceHousing);
    });
  });
});
