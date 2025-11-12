import { faker } from '@faker-js/faker/locale/fr';
import { Array, pipe } from 'effect';
import { MarkRequired } from 'ts-essentials';

import { AddressDTO } from '../AddressDTO';
import { CADASTRAL_CLASSIFICATION_VALUES } from '../CadastralClassification';
import { CAMPAIGN_STATUS_VALUES, CampaignDTO } from '../CampaignDTO';
import { DatafoncierHousing } from '../DatafoncierHousing';
import { DraftDTO } from '../DraftDTO';
import { ENERGY_CONSUMPTION_VALUES } from '../EnergyConsumption';
import { EstablishmentDTO } from '../EstablishmentDTO';
import { ESTABLISHMENT_KIND_VALUES } from '../EstablishmentKind';
import { ESTABLISHMENT_SOURCE_VALUES } from '../EstablishmentSource';
import { EVENT_NAME_VALUES, EventDTO } from '../EventDTO';
import { EventType } from '../EventType';
import { FileUploadDTO } from '../FileUploadDTO';
import { GroupDTO } from '../GroupDTO';
import { HousingDTO } from '../HousingDTO';
import { HOUSING_KIND_VALUES } from '../HousingKind';
import { HousingOwnerDTO } from '../HousingOwnerDTO';
import { HOUSING_STATUS_VALUES } from '../HousingStatus';
import { MUTATION_TYPE_VALUES } from '../Mutation';
import { NoteDTO } from '../NoteDTO';
import { Occupancy, OCCUPANCY_VALUES } from '../Occupancy';
import { OwnerDTO } from '../OwnerDTO';
import { OWNER_KIND_LABELS } from '../OwnerKind';
import { OWNERSHIP_KIND_INTERNAL_VALUES } from '../OwnershipKind';
import { PROPERTY_RIGHT_VALUES } from '../PropertyRight';
import { ProspectDTO } from '../ProspectDTO';
import { SenderDTO, SignatoryDTO } from '../SenderDTO';
import { SignupLinkDTO } from '../SignupLinkDTO';
import { TIME_PER_WEEK_VALUES } from '../TimePerWeek';
import { UserDTO } from '../UserDTO';
import { UserRole } from '../UserRole';
import { RELATIVE_LOCATION_VALUES } from '../RelativeLocation';
import { match } from 'ts-pattern';

export function genGeoCode(): string {
  const geoCode = faker.helpers.arrayElement([
    faker.location.zipCode(),
    faker.helpers.arrayElement(['2A', '2B']) +
      faker.string.numeric({ length: 3 })
  ]);
  const needsReroll =
    geoCode.startsWith('00') ||
    geoCode.startsWith('20') ||
    geoCode.startsWith('99') ||
    geoCode.endsWith('999');
  return needsReroll ? genGeoCode() : geoCode;
}

export function genAddressDTO(): AddressDTO {
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
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    filters: {},
    status: faker.helpers.arrayElement(CAMPAIGN_STATUS_VALUES),
    createdAt: faker.date.past().toJSON(),
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
    ccthp: faker.helpers.arrayElement([
      ...OCCUPANCY_VALUES.filter(
        (occupancy) => occupancy !== Occupancy.UNKNOWN
      ),
      null
    ]),
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

export function genDraftDTO(
  sender: SenderDTO,
  logo?: FileUploadDTO[]
): DraftDTO {
  return {
    id: faker.string.uuid(),
    subject: faker.lorem.sentence(),
    body: faker.lorem.paragraphs(),
    logo: logo ?? null,
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON(),
    sender,
    writtenAt: faker.date.recent().toJSON().substring(0, 'yyyy-mm-dd'.length),
    writtenFrom: faker.location.city()
  };
}

export function genEstablishmentDTO(): EstablishmentDTO {
  const name = faker.location.city();
  return {
    id: faker.string.uuid(),
    name,
    shortName: name,
    siren: faker.string.numeric(9),
    geoCodes: faker.helpers.multiple(() => faker.location.zipCode(), {
      count: { min: 1, max: 10 }
    }),
    available: true,
    kind: faker.helpers.arrayElement(ESTABLISHMENT_KIND_VALUES),
    source: faker.helpers.arrayElement(ESTABLISHMENT_SOURCE_VALUES)
  };
}

type GenEventOptions<Type extends EventType> = Pick<
  Required<EventDTO<Type>>,
  'type' | 'creator' | 'nextOld' | 'nextNew'
>;
export function genEventDTO<Type extends EventType>(
  options: GenEventOptions<Type>
): MarkRequired<EventDTO<Type>, 'creator'> {
  const { type, creator, nextOld, nextNew } = options;
  return {
    id: faker.string.uuid(),
    name: faker.helpers.arrayElement(EVENT_NAME_VALUES),
    type: type,
    conflict: faker.datatype.boolean(),
    nextOld: nextOld,
    nextNew: nextNew,
    createdAt: faker.date.past().toJSON(),
    createdBy: creator.id,
    creator: creator
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
    ownerCount: pipe(
      owners ?? [],
      Array.filter((owner) => owner !== null),
      Array.dedupeWith((a, b) => a.id === b.id),
      (owners) => owners.length
    ),
    createdAt: new Date().toJSON(),
    createdBy: creator,
    archivedAt: null
  };
}

export function genHousingDTO(owner: OwnerDTO | null): HousingDTO {
  // faker.location.zipCode() sometimes returns the department "20"
  const geoCode = faker.helpers.fromRegExp(/[1-9][0-9]{4}/);
  const department = geoCode.substring(0, 2);
  const locality = geoCode.substring(2, 5);
  const invariant = genInvariant(locality);
  return {
    id: faker.string.uuid(),
    geoCode,
    dataFileYears: ['lovac-2024'],
    uncomfortable: faker.datatype.boolean(),
    roomsCount: faker.number.int({ min: 1, max: 10 }),
    livingArea: faker.number.int({ min: 8 }),
    campaignIds: [],
    dataYears: [
      faker.number.int({
        min: 2020,
        max: new Date().getUTCFullYear()
      })
    ],
    source: faker.helpers.arrayElement([
      'lovac',
      'datafoncier-import',
      'datafoncier-manual'
    ]),
    vacancyStartYear: faker.date.past().getUTCFullYear(),
    localId: genLocalId(department, invariant),
    invariant: genInvariant(locality),
    rawAddress: faker.location
      .streetAddress({ useFullAddress: true })
      .split(' '),
    cadastralClassification: faker.helpers.arrayElement(
      CADASTRAL_CLASSIFICATION_VALUES
    ),
    cadastralReference: null,
    longitude: faker.location.longitude(),
    latitude: faker.location.latitude(),
    occupancy: faker.helpers.arrayElement(OCCUPANCY_VALUES),
    occupancyIntended: faker.helpers.arrayElement(OCCUPANCY_VALUES),
    housingKind: faker.helpers.arrayElement(HOUSING_KIND_VALUES),
    status: faker.helpers.arrayElement(HOUSING_STATUS_VALUES),
    subStatus: null,
    energyConsumption: faker.helpers.arrayElement([
      null,
      ...ENERGY_CONSUMPTION_VALUES
    ]),
    energyConsumptionAt: faker.helpers.maybe(() => faker.date.past()) ?? null,
    owner,
    lastMutationType: faker.helpers.arrayElement(MUTATION_TYPE_VALUES),
    lastMutationDate: faker.date.past().toJSON(),
    lastTransactionDate: faker.date.past().toJSON(),
    lastTransactionValue: faker.number.int({ min: 1_000_000, max: 10_000_000 }),
    buildingYear: faker.date.past().getUTCFullYear(),
    buildingLocation: null,
    beneficiaryCount: null,
    ownershipKind: faker.helpers.arrayElement(OWNERSHIP_KIND_INTERNAL_VALUES),
    taxed: faker.datatype.boolean(),
    rentalValue: faker.number.int({ min: 100, max: 10_000 })
  };
}

export function genHousingOwnerDTO(owner: OwnerDTO): HousingOwnerDTO {
  const relativeLocation = faker.helpers.arrayElement(RELATIVE_LOCATION_VALUES);
  const absoluteDistance = match(relativeLocation)
    .returnType<number | null>()
    .with('same-commune', () => faker.number.int({ min: 0, max: 100 }))
    .with('same-department', () => faker.number.int({ min: 100, max: 200 }))
    .with('same-region', () => faker.number.int({ min: 200, max: 500 }))
    .with('metropolitan', () => faker.number.int({ min: 500, max: 1000 }))
    .with('overseas', () => faker.number.int({ min: 1000, max: 5000 }))
    .with('other', () => null)
    .exhaustive();

  return {
    ...owner,
    rank: faker.helpers.arrayElement([-2, -1, 0, 1, 2, 3, 4, 5, 6]),
    idprocpte: faker.string.numeric(11),
    idprodroit: faker.string.numeric(13),
    locprop: faker.number.int(9),
    relativeLocation,
    absoluteDistance,
    propertyRight: faker.helpers.arrayElement(PROPERTY_RIGHT_VALUES)
  };
}

export function genInvariant(locality: string): string {
  return locality + faker.string.alpha(7);
}

export function genLocalId(department: string, invariant: string): string {
  return department + invariant;
}

export function genNoteDTO(creator: UserDTO): NoteDTO {
  const createdAt = faker.date.past();
  const updatedAt = faker.date.between({ from: createdAt, to: new Date() });
  return {
    id: faker.string.uuid(),
    content: faker.lorem.paragraph(),
    noteKind: 'Note courante',
    createdBy: creator.id,
    createdAt: createdAt.toJSON(),
    updatedAt: updatedAt.toJSON(),
    creator
  };
}

export function genOwnerDTO(): OwnerDTO {
  const id = faker.string.uuid();
  const address = genAddressDTO();
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  const kind = faker.helpers.arrayElement(Object.values(OWNER_KIND_LABELS));
  return {
    id,
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
    email: faker.internet.email({
      firstName,
      lastName
    }),
    phone: faker.phone.number().replace(/\s+/g, ''),
    kind,
    kindDetail: null,
    siren: kind === 'Particulier' ? null : faker.string.numeric(9),
    createdAt: faker.date.past().toJSON(),
    updatedAt: faker.date.recent().toJSON()
  };
}

export function genProspectDTO(establishment: EstablishmentDTO): ProspectDTO {
  const { id, siren } = establishment;
  return {
    email: faker.internet.email(),
    establishment: { id, siren },
    hasAccount: true,
    hasCommitment: true
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
    signatories:
      faker.helpers.maybe(() => [
        faker.helpers.maybe(genSignatoryDTO) ?? null,
        faker.helpers.maybe(genSignatoryDTO) ?? null
      ]) ?? null,
    createdAt: faker.date.past().toJSON(),
    updatedAt: faker.date.recent().toJSON()
  };
}

function genSignatoryDTO(signature?: FileUploadDTO): SignatoryDTO {
  return {
    file: signature ?? null,
    role: faker.person.jobTitle(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName()
  };
}

export function genSignupLinkDTO(prospectEmail: string): SignupLinkDTO {
  return {
    id: faker.string.uuid(),
    prospectEmail,
    expiresAt: faker.date.soon({ days: 7 })
  };
}

export function genUserDTO(
  role = UserRole.USUAL,
  establishment?: Pick<EstablishmentDTO, 'id'>
): UserDTO {
  return {
    id: faker.string.uuid(),
    email: faker.internet.email(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    phone: faker.phone.number(),
    position: faker.person.jobTitle(),
    timePerWeek: faker.helpers.arrayElement(TIME_PER_WEEK_VALUES),
    activatedAt: faker.date.recent().toJSON(),
    lastAuthenticatedAt: faker.date.recent().toJSON(),
    updatedAt: faker.date.recent().toJSON(),
    establishmentId: establishment?.id ?? null,
    role
  };
}
