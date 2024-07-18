import { fromOwnerPayloadDTO } from '~/models/OwnerApi';

describe('OwnerApi', () => {
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
        weird: 'weird',
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
        rawAddress: ['1 rue de la Paix', '75000 Paris'],
      };

      const actual = fromOwnerPayloadDTO(payload);

      expect(actual.birthDate).toStrictEqual(date);
    });
  });
});
