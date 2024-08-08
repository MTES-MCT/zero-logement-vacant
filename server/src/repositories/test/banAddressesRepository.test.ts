import { faker } from '@faker-js/faker/locale/fr';

import { AddressKinds } from '@zerologementvacant/shared';
import banAddressesRepository, {
  AddressDBO,
  Addresses
} from '~/repositories/banAddressesRepository';
import { genAddressApi } from '~/test/testFixtures';

describe('BAN addresses repository', () => {
  describe('save', () => {
    it('should save a BAN address', async () => {
      const refId = faker.string.uuid();
      const address = genAddressApi(refId, AddressKinds.Housing);

      await banAddressesRepository.save(address);

      const actual = await Addresses()
        .where({
          ref_id: refId,
          address_kind: AddressKinds.Housing
        })
        .first();
      expect(actual).toStrictEqual<AddressDBO>({
        ref_id: refId,
        address_kind: AddressKinds.Housing,
        address: address.address,
        house_number: address.houseNumber,
        street: address.street,
        postal_code: address.postalCode,
        city: address.city,
        latitude: address.latitude,
        longitude: address.longitude,
        score: address.score,
        last_updated_at: address.lastUpdatedAt
          ? new Date(address.lastUpdatedAt)
          : undefined
      });
    });
  });
});
