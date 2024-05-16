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
        banAddress: genAddressDTO(id, AddressKinds.Owner),
      };

      const actual = getAddress(owner);

      expect(actual).toIncludeAllMembers([
        `${owner.banAddress?.houseNumber} ${owner.banAddress?.street}`,
        `${owner.banAddress?.postalCode} ${owner.banAddress?.city}`,
      ]);
    });

    it('should return the LOVAC address otherwise', () => {
      const address = faker.location.streetAddress(true);
      const owner: OwnerDTO = {
        ...genOwnerDTO(),
        banAddress: undefined,
        rawAddress: [address],
      };

      const actual = getAddress(owner);

      expect(actual).toIncludeAllMembers([address]);
    });
  });
});
