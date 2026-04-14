import { Factory } from 'fishery';
import { faker } from '@faker-js/faker/locale/fr';
import {
  OWNER_KIND_LABELS,
  type AddressDTO,
  type OwnerDTO
} from '@zerologementvacant/models';
import type { Adapter } from '../adapter';

function genAddressDTO(): AddressDTO {
  return {
    banId: faker.string.uuid(),
    label: faker.location.streetAddress({ useFullAddress: true }),
    houseNumber: faker.location.buildingNumber(),
    street: faker.location.street(),
    postalCode: faker.location.zipCode(),
    city: faker.location.city(),
    cityCode: faker.location.zipCode(),
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    score: faker.number.float({ fractionDigits: 2, min: 0, max: 1 })
  };
}

export function createOwnerFactory(adapter: Adapter) {
  return Factory.define<OwnerDTO>(() => {
    const address = genAddressDTO();
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const kind = faker.helpers.arrayElement(Object.values(OWNER_KIND_LABELS));
    return {
      id: faker.string.uuid(),
      idpersonne:
        faker.helpers.maybe(() => faker.string.alphanumeric(10), {
          probability: 0.8
        }) ?? null,
      administrator: null,
      rawAddress: [
        `${address.houseNumber} ${address.street}`,
        `${address.postalCode} ${address.city}`
      ],
      banAddress: genAddressDTO(),
      additionalAddress:
        faker.helpers.maybe(() => faker.location.county()) ?? null,
      birthDate: faker.date
        .birthdate()
        .toJSON()
        .substring(0, 'yyyy-mm-dd'.length),
      fullName: `${firstName} ${lastName}`,
      email: faker.internet.email({ firstName, lastName }),
      phone: faker.phone.number().replace(/\s+/g, ''),
      kind,
      siren: kind === 'Particulier' ? null : faker.string.numeric(9),
      createdAt: faker.date.past().toJSON(),
      updatedAt: faker.date.recent().toJSON()
    };
  }).onCreate((entity) => adapter.create('owners', entity));
}
