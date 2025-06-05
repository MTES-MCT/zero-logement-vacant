import { faker } from '@faker-js/faker/locale/fr';
import { fromOwnerPayloadDTO, OwnerApi, ownerDiff } from '~/models/OwnerApi';
import { genOwnerApi } from '~/test/testFixtures';

describe('OwnerApi', () => {
  describe('ownerDiff', () => {
    it('should return an empty object when no changes', () => {
      const before: OwnerApi = genOwnerApi();
      const after: OwnerApi = {
        ...before,
        fullName: faker.person.fullName()
      };

      const actual = ownerDiff.diff(before, after);

      expect(actual).toEqual({
        fullName: after.fullName
      });
    });
  });

  describe('fromOwnerPayloadDTO', () => {
    it('should return specific fields', () => {
      // It's intended not to provide a type because any payload could be sent
      const payload = {
        fullName: 'John Doe',
        birthDate: '1990-01-01',
        rawAddress: ['1 rue de la Paix', '75000 Paris'],
        email: 'john.doe@gmail.com',
        phone: '+33 6 12 34 56 78',
        something: 'something',
        weird: 'weird'
      };

      const actual = fromOwnerPayloadDTO(payload);

      expect(actual).toContainAllKeys([
        'fullName',
        'birthDate',
        'rawAddress',
        'email',
        'phone'
      ]);
    });

    it('should parse the date string', () => {
      const date = new Date('1990-01-01T23:00:00Z');
      const payload = {
        fullName: 'John Doe',
        birthDate: date.toISOString(),
        rawAddress: ['1 rue de la Paix', '75000 Paris']
      };

      const actual = fromOwnerPayloadDTO(payload);

      expect(actual.birthDate).toStrictEqual(date);
    });
  });
});
