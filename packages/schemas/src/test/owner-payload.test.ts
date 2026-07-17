import { fc, test } from '@fast-check/vitest';

import { ownerPayload } from '../owner-payload';

describe('Owner payload', () => {
  test.prop([
    fc.record({
      fullName: fc.string({ minLength: 1 }),
      doNotContact: fc.boolean()
    })
  ])('should accept a payload with only the required fields', (payload) => {
    expect(() => ownerPayload.validateSync(payload)).not.toThrow();
  });

  it('should reject when fullName is missing', () => {
    expect(() => ownerPayload.validateSync({ doNotContact: false })).toThrow(
      /fullName/i
    );
  });

  test.prop([fc.boolean()])(
    'should accept a boolean doNotContact',
    (doNotContact) => {
      const result = ownerPayload.validateSync({
        fullName: 'Jane Doe',
        doNotContact
      });
      expect(result.doNotContact).toBe(doNotContact);
    }
  );

  it('should reject a payload without doNotContact', () => {
    expect(() => ownerPayload.validateSync({ fullName: 'Jane Doe' })).toThrow(
      /doNotContact/i
    );
  });

  it('should reject a non-boolean doNotContact', () => {
    expect(() =>
      ownerPayload.validateSync({
        fullName: 'Jane Doe',
        doNotContact: 'yes'
      })
    ).toThrow();
  });

  it('should accept an empty-string email (treated as absent)', () => {
    const result = ownerPayload.validateSync({
      fullName: 'Jane Doe',
      doNotContact: false,
      email: ''
    });
    expect(result.email).toBeUndefined();
  });

  it('should reject a malformed email', () => {
    expect(() =>
      ownerPayload.validateSync({
        fullName: 'Jane Doe',
        doNotContact: false,
        email: 'not-an-email'
      })
    ).toThrow(/email/i);
  });

  it('should reject banAddress when all required fields are missing', () => {
    expect(() =>
      ownerPayload.validateSync({
        fullName: 'Jane Doe',
        doNotContact: false,
        banAddress: {}
      })
    ).toThrow(/identifiant BAN/i);
  });

  it('should accept banAddress: null', () => {
    expect(() =>
      ownerPayload.validateSync({
        fullName: 'Jane Doe',
        doNotContact: false,
        banAddress: null
      })
    ).not.toThrow();
  });

  it('should accept banAddress with all required fields plus extras', () => {
    const banAddress = {
      banId: 'ban-123',
      label: '1 rue des Lilas, 75001 Paris',
      postalCode: '75001',
      city: 'Paris',
      houseNumber: '1',
      street: 'rue des Lilas',
      latitude: 48.85,
      longitude: 2.35,
      score: 0.95
    };
    const result = ownerPayload.validateSync({
      fullName: 'Jane Doe',
      doNotContact: false,
      banAddress
    });
    // mixed() passes the full object through unchanged.
    expect(result.banAddress).toEqual(banAddress);
  });

  it('should reject banAddress missing label', () => {
    expect(() =>
      ownerPayload.validateSync({
        fullName: 'Jane Doe',
        doNotContact: false,
        banAddress: {
          banId: 'ban-123',
          postalCode: '75001',
          city: 'Paris'
        }
      })
    ).toThrow(/libellé/i);
  });

  it('should reject banAddress missing postalCode', () => {
    expect(() =>
      ownerPayload.validateSync({
        fullName: 'Jane Doe',
        doNotContact: false,
        banAddress: {
          banId: 'ban-123',
          label: '1 rue des Lilas',
          city: 'Paris'
        }
      })
    ).toThrow(/code postal/i);
  });

  it('should reject banAddress missing city', () => {
    expect(() =>
      ownerPayload.validateSync({
        fullName: 'Jane Doe',
        doNotContact: false,
        banAddress: {
          banId: 'ban-123',
          label: '1 rue des Lilas',
          postalCode: '75001'
        }
      })
    ).toThrow(/ville/i);
  });
});
