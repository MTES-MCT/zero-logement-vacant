import { fc } from '@fast-check/vitest';
import { faker } from '@faker-js/faker/locale/fr';

import { getAddress, getOwnerDisplayName, OwnerDTO } from '../OwnerDTO';
import { genAddressDTO, genOwnerDTO } from './fixtures';

describe('OwnerDTO', () => {
  describe('getAddress', () => {
    it('should return the BAN address if defined', () => {
      const id = faker.string.uuid();
      const owner: OwnerDTO = {
        ...genOwnerDTO(),
        id,
        additionalAddress: null,
        banAddress: genAddressDTO()
      };

      const actual = getAddress(owner);

      expect(actual).toStrictEqual([owner.banAddress?.label]);
    });

    it('should return the LOVAC address otherwise', () => {
      const address = faker.location.streetAddress(true);
      const owner: OwnerDTO = {
        ...genOwnerDTO(),
        additionalAddress: null,
        banAddress: null,
        rawAddress: [address]
      };

      const actual = getAddress(owner);

      expect(actual).toStrictEqual([address]);
    });

    it('should add the additional address just before the zip code', () => {
      const owner: OwnerDTO = {
        ...genOwnerDTO(),
        banAddress: null,
        rawAddress: ['123 rue Bidon', '01234 Ville'],
        additionalAddress: 'Appart. 1'
      };

      const actual = getAddress(owner);

      expect(actual).toStrictEqual([
        'Appart. 1',
        '123 rue Bidon',
        '01234 Ville'
      ]);
    });
  });

  describe('getOwnerDisplayName', () => {
    it('returns username when set', () => {
      const owner: OwnerDTO = {
        ...genOwnerDTO(),
        fullName: 'DUPONT JEAN',
        username: 'Jean Dupont'
      };

      expect(getOwnerDisplayName(owner)).toBe('Jean Dupont');
    });

    it('falls back to fullName when username is null', () => {
      const owner: OwnerDTO = {
        ...genOwnerDTO(),
        fullName: 'DUPONT JEAN',
        username: null
      };

      expect(getOwnerDisplayName(owner)).toBe('DUPONT JEAN');
    });

    it('property: always returns a non-empty string', () => {
      fc.assert(
        fc.property(
          fc.record({
            fullName: fc.string({ minLength: 1 }),
            username: fc.option(fc.string({ minLength: 1 }), { nil: null })
          }),
          (partial) => {
            const result = getOwnerDisplayName(partial);
            return result.length > 0;
          }
        )
      );
    });
  });
});
