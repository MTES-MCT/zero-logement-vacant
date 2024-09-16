import { faker } from '@faker-js/faker/locale/fr';

import { genAddressDTO, genOwnerDTO } from './fixtures';
import { getAddress, OwnerDTO } from '../OwnerDTO';
import { AddressKinds } from '../AddressDTO';

describe('OwnerDTO', () => {
  describe('getAddress', () => {
    it('should return the BAN address if defined', () => {
      const id = faker.string.uuid();
      const owner: OwnerDTO = {
        ...genOwnerDTO(),
        id,
        additionalAddress: undefined,
        banAddress: genAddressDTO(id, AddressKinds.Owner)
      };

      const actual = getAddress(owner);

      expect(actual).toStrictEqual([owner.banAddress?.label]);
    });

    it('should return the LOVAC address otherwise', () => {
      const address = faker.location.streetAddress(true);
      const owner: OwnerDTO = {
        ...genOwnerDTO(),
        additionalAddress: undefined,
        banAddress: undefined,
        rawAddress: [address]
      };

      const actual = getAddress(owner);

      expect(actual).toStrictEqual([address]);
    });

    it('should add the additional address just before the zip code', () => {
      const owner: OwnerDTO = {
        ...genOwnerDTO(),
        banAddress: undefined,
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
});
