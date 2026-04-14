import { fc, test } from '@fast-check/vitest';

import {
  ENERGY_CONSUMPTION_VALUES,
  getSubStatuses,
  HOUSING_STATUS_VALUES,
  HousingStatus,
  Occupancy,
  OCCUPANCY_VALUES
} from '@zerologementvacant/models';
import { housingUpdatePayload } from '../housing-update-payload';

describe('Housing update payload', () => {
  test.prop(
    [
      fc
        .constantFrom(...HOUSING_STATUS_VALUES)
        .chain((status) => {
          const validSubs = [...getSubStatuses(status)];
          const subStatusArb =
            validSubs.length > 0
              ? fc.oneof(
                  fc.constantFrom(...validSubs),
                  fc.constant(null),
                  fc.constant(undefined)
                )
              : fc.oneof(fc.constant(null), fc.constant(undefined));
          return fc.record({
            status: fc.constant(status),
            subStatus: subStatusArb,
            occupancy: fc.constantFrom(...OCCUPANCY_VALUES),
            occupancyIntended: fc.oneof(
              fc.constantFrom(...OCCUPANCY_VALUES),
              fc.constant(null),
              fc.constant(undefined)
            ),
            actualEnergyConsumption: fc.oneof(
              fc.constantFrom(...ENERGY_CONSUMPTION_VALUES),
              fc.constant(null),
              fc.constant(undefined)
            )
          });
        })
    ]
  )('should validate valid inputs', (payload) => {
    expect(() => housingUpdatePayload.validateSync(payload)).not.toThrow();
  });

  it('should ensure sub-status defaults to null', () => {
    const actual = housingUpdatePayload.validateSync({
      status: HousingStatus.NEVER_CONTACTED,
      occupancy: Occupancy.VACANT,
      subStatus: undefined,
      occupancyIntended: undefined
    });

    expect(actual.subStatus).toBeNull();
    expect(actual.occupancyIntended).toBeNull();
  });

  it('should force the sub-status to null when the status has no sub-statuses', () => {
    const actual = housingUpdatePayload.validateSync({
      status: HousingStatus.NEVER_CONTACTED,
      subStatus: 'Intérêt potentiel / En réflexion',
      occupancy: Occupancy.VACANT,
      occupancyIntended: null
    });

    expect(actual.status).toBe(HousingStatus.NEVER_CONTACTED);
    expect(actual.subStatus).toBeNull();
  });

  it('should reject an invalid sub-status for a status that has sub-statuses', () => {
    expect(() =>
      housingUpdatePayload.validateSync({
        status: HousingStatus.IN_PROGRESS,
        subStatus: 'invalid-sub-status',
        occupancy: Occupancy.VACANT,
        occupancyIntended: null
      })
    ).toThrow();
  });
});
