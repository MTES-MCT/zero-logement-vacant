import { fc, test } from '@fast-check/jest';

import {
  HOUSING_STATUS_VALUES,
  HousingUpdatePayloadDTO,
  OCCUPANCY_VALUES
} from '@zerologementvacant/models';
import { housingUpdatePayload } from '../housing-update-payload';

describe('Housing update payload', () => {
  test.prop<HousingUpdatePayloadDTO>({
    status: fc.constantFrom(...HOUSING_STATUS_VALUES),
    occupancy: fc.constantFrom(...OCCUPANCY_VALUES),
    subStatus: fc.oneof(
      fc.stringMatching(/\S/),
      fc.constant(null),
      fc.constant(undefined)
    ),
    occupancyIntended: fc.oneof(
      fc.constantFrom(...OCCUPANCY_VALUES),
      fc.constant(null),
      fc.constant(undefined)
    )
  })('shoud validate inputs', (payload) => {
    const validate = () => housingUpdatePayload.validateSync(payload);

    expect(validate).not.toThrow();
  });
});
