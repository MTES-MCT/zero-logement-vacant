import { fc, test } from '@fast-check/vitest';

import {
  CADASTRAL_CLASSIFICATION_VALUES,
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
      invariant: fc.string({ minLength: 1, maxLength: 20 }),
      local_id: fc.string({ minLength: 12, maxLength: 12 }),
      building_id: fc.option(fc.string({ minLength: 15, maxLength: 15 })),
      building_location: fc.option(fc.string({ minLength: 1 })),
      building_year: fc.option(
        fc.integer({ min: 1, max: new Date().getUTCFullYear() })
      ),
      plot_id: fc.option(fc.stringMatching(/\S+/)),
      geo_code: fc.string({ minLength: 5, maxLength: 5 }),
      ban_id: fc.option(fc.string({ minLength: 1 })),
      ban_label: fc.option(fc.string({ minLength: 1 })),
      ban_score: fc.option(fc.float({ min: 0, max: 1, noNaN: true })),
      ban_latitude: fc.option(fc.float({ min: -90, max: 90, noNaN: true })),
      ban_longitude: fc.option(fc.float({ min: -180, max: 180, noNaN: true })),
      dgfip_address: fc.string({ minLength: 1 }),
      latitude_dgfip: fc.option(fc.float({ min: -90, max: 90, noNaN: true })),
      longitude_dgfip: fc.option(
        fc.float({ min: -180, max: 180, noNaN: true })
      ),
      housing_kind: fc.constantFrom(...HOUSING_KIND_VALUES),
      condominium: fc.option(
        fc.constantFrom(...OWNERSHIP_KIND_INTERNAL_VALUES)
      ),
      living_area: fc.option(fc.integer({ min: 1 })),
      rooms_count: fc.option(fc.integer({ min: 0 })),
      uncomfortable: fc.option(fc.boolean()),
      cadastral_classification: fc.option(
        fc.constantFrom(...CADASTRAL_CLASSIFICATION_VALUES)
      ),
      taxed: fc.boolean(),
      rental_value: fc.option(fc.integer({ min: 0 })),
      occupancy_source: fc.constantFrom(...OCCUPANCY_VALUES),
      vacancy_start_year: fc.integer({
        min: 1,
        max: new Date().getUTCFullYear()
      }),
      mutation_date: fc.option(
        fc.date({ min: new Date('1970-01-01'), max: new Date('9999-12-31'), noInvalidDate: true }).map((d) => d.toISOString().substring(0, 'yyyy-mm-dd'.length))
      ),
      last_mutation_date: fc.option(
        fc.date({ min: new Date('1970-01-01'), max: new Date('9999-12-31'), noInvalidDate: true }).map((d) => d.toISOString().substring(0, 'yyyy-mm-dd'.length))
      ),
      last_transaction_date: fc.option(
        fc.date({ min: new Date('1970-01-01'), max: new Date('9999-12-31'), noInvalidDate: true }).map((d) => d.toISOString().substring(0, 'yyyy-mm-dd'.length))
      ),
      last_transaction_value: fc.option(fc.integer({ min: 0 })),
      geolocation_source: fc.option(
        fc.constantFrom('parcelle-ff', 'bati-rnb', 'adresse-ban')
      )
    })('should validate a source housing', (sourceHousing) => {
      const validate = () => sourceHousingSchema.parse(sourceHousing);

      expect(validate).not.toThrow();
    });
  });
});
