import { fc, test } from '@fast-check/vitest';

import {
  TIME_PER_WEEK_VALUES,
  UserUpdatePayload
} from '@zerologementvacant/models';
import { userUpdatePayload } from '../user-update-payload';

describe('User update payload', () => {
  test.prop<UserUpdatePayload>({
    firstName: fc.option(fc.string({ minLength: 1, maxLength: 255 })),
    lastName: fc.option(fc.string({ minLength: 1, maxLength: 255 })),
    phone: fc.option(fc.string({ minLength: 1, maxLength: 50 })),
    position: fc.option(fc.string({ minLength: 1, maxLength: 255 })),
    timePerWeek: fc.option(fc.constantFrom(...TIME_PER_WEEK_VALUES))
  })('should validate inputs', (payload) => {
    const validate = () => userUpdatePayload.validateSync(payload);

    expect(validate).not.toThrow();
  });
});