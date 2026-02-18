import { fc, test } from '@fast-check/vitest';

import {
  TIME_PER_WEEK_VALUES,
  UserUpdatePayload
} from '@zerologementvacant/models';
import { userUpdatePayload } from '../user-update-payload';

// Generate valid French phone numbers
const validPhoneArb = fc.oneof(
  // International format: +33XXXXXXXXX
  fc
    .tuple(
      fc.constantFrom(1, 2, 3, 4, 5, 6, 7, 9), // First digit after +33 (not 0 or 8)
      fc.stringMatching(/^[0-9]{8}$/) // 8 more digits
    )
    .map(([first, rest]) => `+33${first}${rest}`),
  // Local format: 0XXXXXXXXX
  fc
    .tuple(
      fc.constantFrom(1, 2, 3, 4, 5, 6, 7, 9), // First digit after 0 (not 0 or 8)
      fc.stringMatching(/^[0-9]{8}$/) // 8 more digits
    )
    .map(([first, rest]) => `0${first}${rest}`)
);

describe('User update payload', () => {
  test.prop<UserUpdatePayload>({
    firstName: fc.option(fc.string({ minLength: 1, maxLength: 255 })),
    lastName: fc.option(fc.string({ minLength: 1, maxLength: 255 })),
    phone: fc.option(validPhoneArb),
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

  describe('phone validation', () => {
    it('should accept +33123456789', () => {
      const validate = () =>
        userUpdatePayload.validateSync({ phone: '+33123456789' });
      expect(validate).not.toThrow();
    });

    it('should accept 0612345678', () => {
      const validate = () =>
        userUpdatePayload.validateSync({ phone: '0612345678' });
      expect(validate).not.toThrow();
    });

    it('should accept null phone', () => {
      const validate = () => userUpdatePayload.validateSync({ phone: null });
      expect(validate).not.toThrow();
    });

    it('should accept empty phone', () => {
      const validate = () => userUpdatePayload.validateSync({ phone: '' });
      expect(validate).not.toThrow();
    });

    it('should reject invalid phone format', () => {
      const validate = () =>
        userUpdatePayload.validateSync({ phone: '123456789' });
      expect(validate).toThrow();
    });
  });
});