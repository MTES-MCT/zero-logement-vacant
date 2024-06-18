import { fakerFR as faker } from '@faker-js/faker';
import fp from 'lodash/fp';

import { AddressDTO, AddressKinds } from '../AddressDTO';
import { CampaignDTO } from '../CampaignDTO';
import { DraftDTO } from '../DraftDTO';
import { GroupDTO } from '../GroupDTO';
import { HousingDTO } from '../HousingDTO';
import { OwnerDTO } from '../OwnerDTO';
import { RolesDTO } from '../RolesDTO';
import { SenderDTO } from '../SenderDTO';
import { UserDTO } from '../UserDTO';
import { OCCUPANCIES } from '../Occupancy';
import { HOUSING_KINDS } from '../HousingKind';
import { DatafoncierHousing } from '../DatafoncierHousing';
import { HOUSING_STATUSES } from '../HousingStatus';

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

export function genDatafoncierHousingDTO(
  geoCode = faker.location.zipCode()
): DatafoncierHousing {
  const department = geoCode.substring(0, 2);
  const locality = geoCode.substring(2, 5);
  const invariant = locality + faker.string.numeric(7);
  const localId = department + invariant;
  return {
    idlocal: localId,
    idbat: faker.string.alpha({ length: 10, casing: 'upper' }),
    idpar: faker.string.alpha({ length: 14, casing: 'upper' }),
    idtup: faker.string.alpha(),
    idsec: faker.string.alpha({ length: 9, casing: 'upper' }),
    idvoie: faker.string.alpha({ length: 9, casing: 'upper' }),
    idprocpte: faker.string.numeric(11),
    idcom: geoCode,
    idcomtxt: faker.location.county(),
    ccodep: faker.string.alpha({ length: 2, casing: 'upper' }),
    ccodir: faker.string.alpha({ length: 1, casing: 'upper' }),
    ccocom: locality,
    invar: invariant,
    ccopre: faker.string.alpha({ length: 3, casing: 'upper' }),
    ccosec: faker.string.alpha({ length: 2, casing: 'upper' }),
    dnupla: faker.string.alpha({ length: 4, casing: 'upper' }),
    dnubat: faker.string.alpha({ length: 2, casing: 'upper' }),
    descc: faker.string.alpha({ length: 2, casing: 'upper' }),
    dniv: faker.string.alpha({ length: 2, casing: 'upper' }),
    dpor: faker.string.alpha({ length: 5, casing: 'upper' }),
    ccoriv: faker.string.alpha({ length: 4, casing: 'upper' }),
    ccovoi: faker.string.alpha({ length: 5, casing: 'upper' }),
    dnvoiri: faker.location.buildingNumber().substring(0, 4),
    dindic: '',
    ccocif: faker.string.alphanumeric(4),
    dvoilib: faker.location.street().substring(0, 30),
    cleinvar: faker.string.alphanumeric(1),
    ccpper: faker.string.alphanumeric(3),
    gpdl: faker.string.alphanumeric(1),
    ctpdl: faker.string.alphanumeric(5),
    dnupro: faker.string.alphanumeric(6),
    jdatat: faker.string.alphanumeric(8),
    jdatatv: faker.string.alphanumeric(8),
    jdatatan: faker.number.int(99),
    dnufnl: faker.string.alphanumeric(6),
    ccoeva: faker.string.alphanumeric(1),
    ccoevatxt: faker.string.alphanumeric(72),
    dteloc: faker.helpers.arrayElement(['1', '2']),
    dteloctxt: faker.helpers.arrayElement(['MAISON', 'APPARTEMENT']),
    logh: faker.string.alphanumeric(1),
    loghmais: faker.string.alphanumeric(1),
    loghappt: faker.string.alphanumeric(1),
    gtauom: faker.string.alphanumeric(2),
    dcomrd: faker.string.alphanumeric(3),
    ccoplc: faker.string.alphanumeric(1),
    ccoplctxt: faker.string.alphanumeric(140),
    cconlc: faker.string.alphanumeric(2),
    cconlctxt: faker.string.alphanumeric(43),
    dvltrt: faker.number.int(99),
    cc48lc: faker.string.alphanumeric(2),
    dloy48a: faker.number.int(99),
    top48a: faker.string.alphanumeric(1),
    dnatlc: faker.string.alphanumeric(1),
    ccthp: faker.helpers.arrayElement(['L', 'V']),
    proba_rprs: faker.string.alphanumeric(7),
    typeact: faker.string.alphanumeric(4),
    loghvac: faker.string.alphanumeric(1),
    loghvac2a: faker.string.alphanumeric(1),
    loghvac5a: faker.string.alphanumeric(1),
    loghvacdeb: faker.string.alphanumeric(5),
    cchpr: faker.string.alphanumeric(1),
    jannat: faker.string.alphanumeric(4),
    dnbniv: faker.string.alphanumeric(2),
    nbetagemax: faker.number.int(9),
    nbnivssol: faker.number.int(9),
    hlmsem: faker.string.alphanumeric(1),
    loghlls: faker.string.alphanumeric(15),
    postel: faker.string.alphanumeric(1),
    dnatcg: faker.string.alphanumeric(2),
    jdatcgl: faker.string.alphanumeric(8),
    fburx: faker.number.int(9),
    gimtom: faker.string.alphanumeric(1),
    cbtabt: faker.string.alphanumeric(2),
    jdbabt: faker.string.alphanumeric(4),
    jrtabt: faker.string.alphanumeric(4),
    cconac: faker.string.alphanumeric(5),
    cconactxt: faker.string.alphanumeric(129),
    toprev: faker.string.alphanumeric(1),
    ccoifp: faker.number.int(99),
    jannath: faker.number.int(9999),
    janbilmin: faker.number.int(9),
    npevph: faker.number.int(9),
    stoth: faker.number.int(9),
    stotdsueic: faker.number.int(9),
    npevd: faker.number.int(9),
    stotd: faker.number.int(9),
    npevp: faker.number.int(9),
    sprincp: faker.number.int(9),
    ssecp: faker.number.int(9),
    ssecncp: faker.number.int(9),
    sparkp: faker.number.int(9),
    sparkncp: faker.number.int(9),
    npevtot: faker.number.int(9),
    slocal: faker.number.int(9),
    npiece_soc: faker.number.int(9),
    npiece_ff: faker.number.int(9),
    npiece_i: faker.number.int(9),
    npiece_p2: faker.number.int(9),
    nbannexe: faker.number.int(9),
    nbgarpark: faker.number.int(9),
    nbagrement: faker.number.int(9),
    nbterrasse: faker.number.int(9),
    nbpiscine: faker.number.int(9),
    ndroit: faker.number.int(9),
    ndroitindi: faker.number.int(9),
    ndroitpro: faker.number.int(9),
    ndroitges: faker.number.int(9),
    catpro2: faker.string.alphanumeric(20),
    catpro2txt: faker.string.alphanumeric(200),
    catpro3: faker.string.alphanumeric(30),
    catpropro2: faker.string.alphanumeric(20),
    catproges2: faker.string.alphanumeric(30),
    locprop: faker.string.alphanumeric(1),
    locproptxt: faker.string.alphanumeric(21),
    source_geo: faker.string.alphanumeric(34),
    vecteur: faker.string.alphanumeric(1),
    ban_id: faker.string.alphanumeric(30),
    ban_geom: null,
    ban_type: faker.string.alphanumeric(15),
    ban_score: faker.number
      .float({ min: 0, max: 1, fractionDigits: 2 })
      .toFixed(2),
    geomloc: null,
    idpk: null,
    code_epci: null,
    lib_epci: null,
    ban_cp: faker.string.alphanumeric(5),
    dis_ban_ff: faker.number.int(9)
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
    rawAddress: faker.location
      .streetAddress({ useFullAddress: true })
      .split(' '),
    occupancy: faker.helpers.arrayElement(OCCUPANCIES),
    kind: faker.helpers.arrayElement(HOUSING_KINDS),
    status: faker.helpers.arrayElement(HOUSING_STATUSES),
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
    phone: faker.helpers.fromRegExp(/0[1-9][0-9]{8}/),
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
