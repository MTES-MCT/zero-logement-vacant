import { fc, test } from '@fast-check/vitest';

import { ownerCreationPayload, ownerUpdatePayload } from '../owner-payload';

describe('Owner creation payload', () => {
  test.prop([
    fc.record({
      fullName: fc.string({ minLength: 1 })
    })
  ])('should accept a payload with only fullName', (payload) => {
    expect(() => ownerCreationPayload.validateSync(payload)).not.toThrow();
  });

  it('should reject when fullName is missing', () => {
    expect(() => ownerCreationPayload.validateSync({})).toThrow(/fullName/i);
  });

  it('should accept an empty-string email (treated as absent)', () => {
    const result = ownerCreationPayload.validateSync({
      fullName: 'Jane Doe',
      email: ''
    });
    expect(result.email).toBeUndefined();
  });

  it('should reject a malformed email', () => {
    expect(() =>
      ownerCreationPayload.validateSync({
        fullName: 'Jane Doe',
        email: 'not-an-email'
      })
    ).toThrow(/email/i);
  });

  it('should reject banAddress when all required fields are missing', () => {
    expect(() =>
      ownerCreationPayload.validateSync({
        fullName: 'Jane Doe',
        banAddress: {}
      })
    ).toThrow(/identifiant BAN/i);
  });

  it('should accept banAddress: null', () => {
    expect(() =>
      ownerCreationPayload.validateSync({
        fullName: 'Jane Doe',
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
    const result = ownerCreationPayload.validateSync({
      fullName: 'Jane Doe',
      banAddress
    });
    // mixed() passes the full object through unchanged.
    expect(result.banAddress).toEqual(banAddress);
  });

  it('should reject banAddress missing label', () => {
    expect(() =>
      ownerCreationPayload.validateSync({
        fullName: 'Jane Doe',
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
      ownerCreationPayload.validateSync({
        fullName: 'Jane Doe',
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
      ownerCreationPayload.validateSync({
        fullName: 'Jane Doe',
        banAddress: {
          banId: 'ban-123',
          label: '1 rue des Lilas',
          postalCode: '75001'
        }
      })
    ).toThrow(/ville/i);
  });
});

describe('Owner update payload', () => {
  test.prop([
    fc.record({
      fullName: fc.string({ minLength: 1 }),
      doNotContact: fc.boolean()
    })
  ])('should accept a payload with the required fields', (payload) => {
    expect(() => ownerUpdatePayload.validateSync(payload)).not.toThrow();
  });

  it('should reject when fullName is missing', () => {
    expect(() =>
      ownerUpdatePayload.validateSync({ doNotContact: false })
    ).toThrow(/fullName/i);
  });

  test.prop([fc.boolean()])(
    'should accept a boolean doNotContact',
    (doNotContact) => {
      const result = ownerUpdatePayload.validateSync({
        fullName: 'Jane Doe',
        doNotContact
      });
      expect(result.doNotContact).toBe(doNotContact);
    }
  );

  it('should reject a payload without doNotContact', () => {
    expect(() =>
      ownerUpdatePayload.validateSync({ fullName: 'Jane Doe' })
    ).toThrow(/doNotContact/i);
  });

  it('should reject a non-boolean doNotContact', () => {
    expect(() =>
      ownerUpdatePayload.validateSync({
        fullName: 'Jane Doe',
        doNotContact: 'yes'
      })
    ).toThrow();
  });
});
