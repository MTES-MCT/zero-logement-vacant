import { faker } from '@faker-js/faker/locale/fr';
import { Knex } from 'knex';

import {
  AddressDBO,
  Addresses,
  banAddressesTable
} from '~/repositories/banAddressesRepository';
import { Owners } from '~/repositories/ownerRepository';
import { AddressKinds } from '@zerologementvacant/models';

export async function seed(knex: Knex): Promise<void> {
  await Addresses(knex).delete();

  const owners = await Owners(knex).select('id');
  const addresses = owners
    .map((owner) => owner.id)
    .map<AddressDBO>((id) => ({
      ref_id: id,
      address_kind: AddressKinds.Owner,
      address: faker.location.streetAddress({ useFullAddress: true }),
      house_number: faker.location.buildingNumber(),
      street: faker.location.street(),
      postal_code: faker.location.zipCode(),
      city: faker.location.city(),
      // Metropolitan France coordinates
      latitude: faker.location.latitude({ min: 42, max: 51 }),
      longitude: faker.location.longitude({ min: -4, max: 7 }),
      score: faker.number.float({ min: 0, max: 1, fractionDigits: 2 })
    }));

  await knex.batchInsert(banAddressesTable, addresses);
}
