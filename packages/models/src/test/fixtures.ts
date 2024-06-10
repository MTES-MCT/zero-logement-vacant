import { faker } from '@faker-js/faker';

import { OwnerDTO } from '../OwnerDTO';
import { AddressDTO, AddressKinds } from '../AddressDTO';
import { CampaignDTO } from '../CampaignDTO';
import { HousingDTO } from '../HousingDTO';
import { DraftDTO } from '../DraftDTO';
import { SenderDTO } from '../SenderDTO';
import { GroupDTO } from '../GroupDTO';
import { UserDTO } from '../UserDTO';
import fp from 'lodash/fp';
import { RolesDTO } from '../RolesDTO';

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

export function genCampaignDTO(group?: GroupDTO): CampaignDTO {
  return {
    id: faker.string.uuid(),
    title: faker.commerce.product(),
    filters: {},
    status: 'draft',
    createdAt: new Date().toJSON(),
    groupId: group?.id
  };
}

export function genDraftDTO(sender: SenderDTO): DraftDTO {
  return {
    id: faker.string.uuid(),
    subject: faker.lorem.sentence(),
    body: faker.lorem.paragraphs(),
    logo: faker.helpers.multiple(() => faker.image.url(), {
      count: { min: 1, max: 2 }
    }),
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON(),
    sender,
    writtenAt: faker.date.recent().toJSON().substring(0, 'yyyy-mm-dd'.length),
    writtenFrom: faker.location.city()
  };
}

export function genGroupDTO(
  creator: UserDTO,
  housings?: HousingDTO[]
): GroupDTO {
  const owners = housings?.map((housing) => housing.owner);
  return {
    id: faker.string.uuid(),
    title: faker.commerce.productName(),
    description: faker.lorem.sentence(),
    housingCount: housings?.length ?? 0,
    ownerCount: fp.uniqBy('id', owners).length ?? 0,
    createdAt: new Date().toJSON(),
    createdBy: creator,
    archivedAt: null
  };
}

export function genHousingDTO(owner: OwnerDTO): HousingDTO {
  const geoCode = faker.location.zipCode();
  const department = geoCode.substring(0, 2);
  const locality = geoCode.substring(2, 5);
  const invariant = genInvariant(locality);
  return {
    id: faker.string.uuid(),
    geoCode,
    localId: genLocalId(department, invariant),
    owner
  };
}

export function genInvariant(locality: string): string {
  return locality + faker.string.alpha(7);
}

export function genLocalId(department: string, invariant: string): string {
  return department + invariant;
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

export function genSenderDTO(): SenderDTO {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    id: faker.string.uuid(),
    name: `${faker.location.zipCode()} ${faker.location.city()}`,
    service: faker.company.name(),
    firstName,
    lastName,
    address: faker.location.streetAddress({ useFullAddress: true }),
    email: faker.internet.email({ firstName, lastName }),
    phone: faker.phone.number(),
    signatoryFile: faker.image.urlPicsumPhotos(),
    signatoryRole: faker.person.jobTitle(),
    signatoryFirstName: faker.person.firstName(),
    signatoryLastName: faker.person.lastName(),
    createdAt: faker.date.past().toJSON(),
    updatedAt: faker.date.recent().toJSON()
  };
}

export function genUserDTO(role = RolesDTO.Usual): UserDTO {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    activatedAt: faker.date.recent().toJSON(),
    role
  };
}
