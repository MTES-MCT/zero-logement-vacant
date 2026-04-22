import {
  HOUSING_STATUS_LABELS,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  Occupancy,
  OCCUPANCY_LABELS
} from '@zerologementvacant/models';
import { HousingApi } from '~/models/HousingApi';
import { createNoopReporter } from '~/scripts/import-lovac/infra/reporters/noop-reporter';
import {
  createExistingHousingTransform,
  HousingUpdateChange,
  HousingEventChange
} from '~/scripts/import-lovac/housings/housing-transform';
import { genEstablishmentApi, genHousingApi, genUserApi } from '~/test/testFixtures';

describe('createExistingHousingTransform', () => {
  const establishment = genEstablishmentApi();
  const auth = genUserApi(establishment.id);
  const transform = createExistingHousingTransform({
    auth,
    year: 'lovac-2025',
    reporter: createNoopReporter()
  });

  let housing: HousingApi;
  beforeEach(() => {
    housing = genHousingApi();
  });

  describe('If the housing is present in LOVAC 2025', () => {
    beforeEach(() => {
      housing.dataFileYears = ['lovac-2023', 'lovac-2024', 'lovac-2025'];
    });

    it('should skip it', () => {
      expect(transform(housing)).toHaveLength(0);
    });
  });

  describe('Otherwise the housing is missing from LOVAC 2025', () => {
    beforeEach(() => {
      housing.dataFileYears = ['lovac-2023'];
    });

    describe('if it is vacant', () => {
      beforeEach(() => {
        housing.occupancy = Occupancy.VACANT;
        housing.status = HousingStatus.NEVER_CONTACTED;
        housing.subStatus = null;
      });

      const skippedStatuses = HOUSING_STATUS_VALUES.filter(
        (status) =>
          status !== HousingStatus.NEVER_CONTACTED &&
          status !== HousingStatus.WAITING
      );

      it.each(skippedStatuses)(
        'should skip if status is %s',
        (status) => {
          expect(transform({ ...housing, status })).toHaveLength(0);
        }
      );

      it.each([HousingStatus.NEVER_CONTACTED, HousingStatus.WAITING])(
        'should be set as out of vacancy when status is %s',
        (status) => {
        const actual = transform({ ...housing, status });
        expect(actual).toPartiallyContain<HousingUpdateChange>({
          type: 'housing',
          kind: 'update',
          value: expect.objectContaining<Partial<HousingUpdateChange['value']>>({
            occupancy: Occupancy.UNKNOWN,
            status: HousingStatus.COMPLETED,
            subStatus: 'Sortie de la vacance'
          })
        });
      });

      it('should create a "Changement de statut d\'occupation" event', () => {
        const actual = transform(housing);
        expect(actual).toPartiallyContain<HousingEventChange>({
          type: 'event',
          kind: 'create',
          value: expect.objectContaining<Partial<HousingEventChange['value']>>({
            type: 'housing:occupancy-updated',
            nextOld: { occupancy: OCCUPANCY_LABELS[housing.occupancy] },
            nextNew: { occupancy: OCCUPANCY_LABELS[Occupancy.UNKNOWN] },
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
        });
      });

      it('should create a "Changement de statut de suivi" event', () => {
        const actual = transform(housing);
        expect(actual).toPartiallyContain<HousingEventChange>({
          type: 'event',
          kind: 'create',
          value: expect.objectContaining<Partial<HousingEventChange['value']>>({
            type: 'housing:status-updated',
            nextOld: {
              status: HOUSING_STATUS_LABELS[housing.status],
              subStatus: null
            },
            nextNew: {
              status: HOUSING_STATUS_LABELS[HousingStatus.COMPLETED],
              subStatus: 'Sortie de la vacance'
            },
            housingId: housing.id,
            housingGeoCode: housing.geoCode
          })
        });
      });
    });
  });
});
