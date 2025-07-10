import { diffUpdatedOwner } from '~/models/OwnerApi';
import { EventApi } from '../EventApi';

describe('OwnerApi', () => {
  describe('diffOwnerPayload', () => {
    it('should return changed keys if any', () => {
      const before: EventApi<'owner:updated'>['nextNew'] = {
        name: 'Just Harry',
        birthdate: null,
        email: null,
        phone: null,
        address: null,
        additionalAddress: null
      };
      const after: EventApi<'owner:updated'>['nextOld'] = {
        name: 'Harry Potter',
        birthdate: '1995-01-01',
        email: 'harry.potter@hogwarts.org',
        phone: '0123456789',
        address: '4 Privet Drive, Little Whinging, Surrey',
        additionalAddress: 'Dans le placard, sous l’escalier'
      };

      const actual = diffUpdatedOwner(before, after);

      expect(actual.before).toStrictEqual<
        ReturnType<typeof diffUpdatedOwner>['before']
      >({
        name: 'Just Harry',
        birthdate: null,
        email: null,
        phone: null,
        address: null,
        additionalAddress: null
      });
      expect(actual.after).toStrictEqual<
        ReturnType<typeof diffUpdatedOwner>['after']
      >({
        name: 'Harry Potter',
        birthdate: '1995-01-01',
        email: 'harry.potter@hogwarts.org',
        phone: '0123456789',
        address: '4 Privet Drive, Little Whinging, Surrey',
        additionalAddress: 'Dans le placard, sous l’escalier'
      });
    });
  });
});
