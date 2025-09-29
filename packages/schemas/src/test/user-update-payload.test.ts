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
    timePerWeek: fc.option(fc.constantFrom(...TIME_PER_WEEK_VALUES)),
    password: fc.option(
      fc.record({
        before: fc.string({ minLength: 1, maxLength: 255 }),
        after: fc
          .tuple(
            fc.stringMatching(/[a-z]/g),
            fc.stringMatching(/[A-Z]/g),
            fc.stringMatching(/[0-9]/g),
            fc.stringMatching(/\S{9,255}/g)
          )
          .map(
            ([lowercase, uppercase, number, rest]) =>
              lowercase + uppercase + number + rest
          )
      }),
      { nil: undefined }
    )
  })('should validate user update payload inputs', (payload) => {
    const validate = () => userUpdatePayload.validateSync(payload);

    expect(validate).not.toThrow();
  });
});