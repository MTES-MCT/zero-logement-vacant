import { fc, test } from '@fast-check/vitest';
import { ValidationError } from 'yup';
import {
  BENEFIARY_COUNT_VALUES,
  BUILDING_PERIOD_VALUES,
  CADASTRAL_CLASSIFICATION_VALUES,
  CAMPAIGN_COUNT_VALUES,
  DATA_FILE_YEAR_VALUES,
  ENERGY_CONSUMPTION_VALUES,
  getSubStatuses,
  HOUSING_BY_BUILDING_VALUES,
  HOUSING_KIND_VALUES,
  HOUSING_STATUS_VALUES,
  HousingBatchUpdatePayload,
  HousingStatus,
  LAST_MUTATION_TYPE_FILTER_VALUES,
  LAST_MUTATION_YEAR_FILTER_VALUES,
  LIVING_AREA_VALUES,
  LOCALITY_KIND_VALUES,
  OCCUPANCY_VALUES,
  OWNER_AGE_VALUES,
  OWNER_KIND_VALUES,
  OWNERSHIP_KIND_VALUES,
  ROOM_COUNT_VALUES,
  VACANCY_RATE_VALUES,
  VACANCY_YEAR_VALUES
} from '@zerologementvacant/models';
import { housingBatchUpdatePayload } from '../housing-batch-update-payload';

const filtersArb = fc.record({
  all: fc.boolean(),
  housingIds: fc.array(fc.uuid({ version: 4 })),
  occupancies: fc.array(fc.constantFrom(...OCCUPANCY_VALUES)),
  energyConsumption: fc.array(
    fc.constantFrom(null, ...ENERGY_CONSUMPTION_VALUES)
  ),
  establishmentIds: fc.array(fc.uuid({ version: 4 })),
  groupIds: fc.array(fc.uuid({ version: 4 })),
  campaignsCounts: fc.array(fc.constantFrom(...CAMPAIGN_COUNT_VALUES)),
  campaignIds: fc.array(
    fc.oneof(fc.constant(null), fc.uuid({ version: 4 }))
  ),
  ownerIds: fc.array(fc.uuid({ version: 4 })),
  ownerKinds: fc.array(fc.constantFrom(null, ...OWNER_KIND_VALUES)),
  ownerAges: fc.array(fc.constantFrom(null, ...OWNER_AGE_VALUES)),
  multiOwners: fc.array(fc.boolean()),
  beneficiaryCounts: fc.array(fc.constantFrom(...BENEFIARY_COUNT_VALUES)),
  housingKinds: fc.array(fc.constantFrom(...HOUSING_KIND_VALUES)),
  housingAreas: fc.array(fc.constantFrom(...LIVING_AREA_VALUES)),
  roomsCounts: fc.array(fc.constantFrom(...ROOM_COUNT_VALUES)),
  cadastralClassifications: fc.array(
    fc.constantFrom(null, ...CADASTRAL_CLASSIFICATION_VALUES)
  ),
  buildingPeriods: fc.array(fc.constantFrom(...BUILDING_PERIOD_VALUES)),
  vacancyYears: fc.array(fc.constantFrom(...VACANCY_YEAR_VALUES)),
  isTaxedValues: fc.array(fc.boolean()),
  ownershipKinds: fc.array(fc.constantFrom(...OWNERSHIP_KIND_VALUES)),
  housingCounts: fc.array(fc.constantFrom(...HOUSING_BY_BUILDING_VALUES)),
  vacancyRates: fc.array(fc.constantFrom(...VACANCY_RATE_VALUES)),
  intercommunalities: fc.array(fc.uuid({ version: 4 })),
  localities: fc.array(fc.string({ minLength: 5, maxLength: 5 })),
  localityKinds: fc.array(fc.constantFrom(null, ...LOCALITY_KIND_VALUES)),
  geoPerimetersIncluded: fc.array(fc.string({ minLength: 1 })),
  geoPerimetersExcluded: fc.array(fc.string({ minLength: 1 })),
  dataFileYearsIncluded: fc.array(
    fc.constantFrom(null, ...DATA_FILE_YEAR_VALUES)
  ),
  dataFileYearsExcluded: fc.array(
    fc.constantFrom(null, ...DATA_FILE_YEAR_VALUES)
  ),
  status: fc.constantFrom(...HOUSING_STATUS_VALUES),
  statusList: fc.array(fc.constantFrom(...HOUSING_STATUS_VALUES)),
  subStatus: fc.array(fc.string({ minLength: 1 })),
  query: fc.string(),
  precisions: fc.array(fc.string({ minLength: 1 })),
  lastMutationYears: fc.array(
    fc.constantFrom(null, ...LAST_MUTATION_YEAR_FILTER_VALUES)
  ),
  lastMutationTypes: fc.array(
    fc.constantFrom(null, ...LAST_MUTATION_TYPE_FILTER_VALUES)
  )
});

/**
 * Generates a correlated (status, subStatus) pair that satisfies the
 * sub-status coherence rule.
 */
const validStatusSubStatusArb = fc.oneof(
  // No status update — subStatus unconstrained so leave it out
  fc.constant({ status: undefined as HousingStatus | undefined, subStatus: undefined as string | undefined }),
  // Status with no sub-statuses — subStatus will be coerced away
  fc.constantFrom(HousingStatus.NEVER_CONTACTED, HousingStatus.WAITING).map(
    (status) => ({ status, subStatus: undefined as string | undefined })
  ),
  // Status with sub-statuses — valid subStatus or absent
  fc
    .constantFrom(
      HousingStatus.FIRST_CONTACT,
      HousingStatus.IN_PROGRESS,
      HousingStatus.COMPLETED,
      HousingStatus.BLOCKED
    )
    .chain((status) => {
      const validSubs = [...getSubStatuses(status)];
      return fc
        .option(fc.constantFrom(...validSubs), { nil: undefined })
        .map((subStatus) => ({ status, subStatus }));
    })
);

describe('Housing batch update payload', () => {
  test.prop([
    fc
      .record({
        filters: filtersArb,
        occupancy: fc.option(fc.constantFrom(...OCCUPANCY_VALUES), {
          nil: undefined
        }),
        occupancyIntended: fc.option(fc.constantFrom(...OCCUPANCY_VALUES), {
          nil: undefined
        }),
        note: fc.option(fc.stringMatching(/\S/), { nil: undefined }),
        precisions: fc.option(
          fc.array(fc.uuid({ version: 4 }), { minLength: 1, maxLength: 10 }),
          { nil: undefined }
        ),
        documents: fc.option(
          fc.array(fc.uuid({ version: 4 }), { minLength: 1, maxLength: 10 }),
          { nil: undefined }
        )
      })
      .chain((base) =>
        validStatusSubStatusArb.map((ss) => ({
          ...base,
          ...ss
        }))
      )
  ])('should validate valid inputs', (payload) => {
    const validate = () =>
      housingBatchUpdatePayload.validateSync(payload as HousingBatchUpdatePayload);

    expect(validate).not.toThrow();
  });

  it('should force the sub-status to null when the status has no sub-statuses', () => {
    const actual = housingBatchUpdatePayload.validateSync({
      filters: { all: false },
      status: HousingStatus.NEVER_CONTACTED,
      subStatus: 'En accompagnement'
    });

    expect(actual.subStatus).toBeNull();
  });

  it('should reject an invalid sub-status for a status that has sub-statuses', () => {
    expect(() =>
      housingBatchUpdatePayload.validateSync({
        filters: { all: false },
        status: HousingStatus.IN_PROGRESS,
        subStatus: 'invalid-sub-status'
      })
    ).toThrow();
  });

  it('should throw a ValidationError (not TypeError) when status is an unknown number', () => {
    expect(() =>
      housingBatchUpdatePayload.validateSync({
        filters: { all: false },
        status: 99,
        subStatus: 'some-sub-status'
      })
    ).toThrow(ValidationError);
  });
});
