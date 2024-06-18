import { faker } from '@faker-js/faker';

import { OwnerDTO } from '../models';
import { AddressDTO, AddressKinds } from '../models/AdresseDTO';

export function genAddressDTO(
  refId: string,
  addressKind: AddressKinds
): AddressDTO {
  return {
    refId,
    addressKind,
    houseNumber: faker.location.buildingNumber(),
    street: faker.location.street(),
    postalCode: faker.location.zipCode(),
    city: faker.location.city(),
    latitude: faker.location.latitude(),
    longitude: faker.location.longitude(),
    score: faker.number.float({
      fractionDigits: 2,
      min: 0,
      max: 1
    })
  };
}

export function genOwnerDTO(): OwnerDTO {
  const id = faker.string.uuid();
  const address = genAddressDTO(id, AddressKinds.Owner);
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    id,
    rawAddress: [
      `${address.houseNumber} ${address.street}`,
      `${address.postalCode} ${address.city}`
    ],
    banAddress: genAddressDTO(id, AddressKinds.Owner),
    additionalAddress: faker.helpers.maybe(() => faker.location.county()),
    birthDate: faker.date.birthdate(),
    fullName: `${firstName} ${lastName}`,
    email: faker.internet.email({
      firstName,
      lastName
    }),
    phone: faker.phone.number(),
    kind: 'PERSONNE PHYSIQUE'
  };
}
