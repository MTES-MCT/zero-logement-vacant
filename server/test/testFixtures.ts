import { faker } from '@faker-js/faker/locale/fr';
import * as turf from '@turf/turf';
import { addHours } from 'date-fns';
import randomstring from 'randomstring';
import { MarkRequired } from 'ts-essentials';
import { v4 as uuidv4 } from 'uuid';

import { UserApi, UserRoles } from '../models/UserApi';
import { OwnerApi } from '../models/OwnerApi';
import {
  CampaignIntent,
  EstablishmentApi,
  hasPriority,
  INTENTS,
} from '../models/EstablishmentApi';
import {
  ENERGY_CONSUMPTION_GRADES,
  HousingApi,
  OccupancyKindApi,
  OwnershipKindsApi,
} from '../models/HousingApi';
import { CampaignApi } from '../models/CampaignApi';
import { GeoPerimeterApi } from '../models/GeoPerimeterApi';
import { ProspectApi } from '../models/ProspectApi';
import {
  RESET_LINK_EXPIRATION,
  RESET_LINK_LENGTH,
  ResetLinkApi,
} from '../models/ResetLinkApi';
import { ContactPointApi } from '../models/ContactPointApi';
import {
  SIGNUP_LINK_EXPIRATION,
  SIGNUP_LINK_LENGTH,
  SignupLinkApi,
} from '../models/SignupLinkApi';
import { LocalityApi, TaxKindsApi } from '../models/LocalityApi';
import { OwnerProspectApi } from '../models/OwnerProspectApi';
import { SettingsApi } from '../models/SettingsApi';
import { HousingStatusApi } from '../models/HousingStatusApi';
import {
  EventApi,
  GroupHousingEventApi,
  HousingEventApi,
  OwnerEventApi,
} from '../models/EventApi';
import { EventKinds } from '../../shared/types/EventKind';
import { EventCategories } from '../../shared/types/EventCategory';
import { EventSections } from '../../shared/types/EventSection';
import {
  DatafoncierHousing,
  firstDefined,
  HOUSING_SOURCES,
  UserAccountDTO,
} from '../../shared';
import { GroupApi } from '../models/GroupApi';
import { DatafoncierOwner } from '../../scripts/shared';
import { HousingOwnerApi } from '../models/HousingOwnerApi';
import { OwnerMatchDBO } from '../repositories/ownerMatchRepository';
import {
  ConflictApi,
  HousingOwnerConflictApi,
  OwnerConflictApi,
} from '../models/ConflictApi';
import {
  ESTABLISHMENT_KINDS,
  EstablishmentKind,
} from '../../shared/types/EstablishmentKind';
import { logger } from '../utils/logger';
import { BuildingApi } from '../models/BuildingApi';
import { AddressApi } from '../models/AddressApi';
import { AddressKinds } from '../../shared/models/AdresseDTO';
import { HousingNoteApi, NoteApi } from '../models/NoteApi';
import { DraftApi } from '../models/DraftApi';
import { SenderApi } from '../models/SenderApi';

logger.debug(`Seed: ${faker.seed()}`);
export const genEmail = () => faker.internet.email();

export const genGeoCode = (): string => {
  const geoCode = faker.location.zipCode();
  const needsReroll =
    geoCode.startsWith('00') ||
    geoCode.startsWith('20') ||
    geoCode.startsWith('99') ||
    geoCode.endsWith('999');
  return needsReroll ? genGeoCode() : geoCode;
};

/**
 * A locality string of 3 numeric characters
 * @param locality
 */
export const genInvariant = (
  locality: string = faker.string.numeric(3)
): string => locality + faker.string.alpha(7);

export const genLocalId = (department: string, invariant: string): string =>
  department + invariant;

export const genNumber = (length = 10) => {
  return Number(
    randomstring.generate({
      length,
      charset: 'numeric',
    })
  );
};

export const genBoolean = () => faker.datatype.boolean();

export const genSiren = () => genNumber(9);
export function oneOf<T>(array: Array<T>): T {
  return faker.helpers.arrayElement(array);
}
export function manyOf<T>(array: Array<T>, nb: number): T[] {
  return faker.helpers.arrayElements(array, nb);
}

export const genLocalityApi = (geoCode = genGeoCode()): LocalityApi => {
  return {
    id: uuidv4(),
    geoCode,
    name: faker.location.city(),
    taxKind: TaxKindsApi.None,
  };
};

export const genEstablishmentApi = (
  ...geoCodes: string[]
): EstablishmentApi => {
  const campaignIntent = oneOf<CampaignIntent>(INTENTS);
  const city = faker.location.city();
  return {
    id: uuidv4(),
    name: city,
    shortName: city,
    siren: genSiren(),
    geoCodes: geoCodes.length > 0 ? geoCodes : [genGeoCode()],
    campaignIntent,
    available: true,
    priority: hasPriority({ campaignIntent }) ? 'high' : 'standard',
    kind: oneOf<EstablishmentKind>(ESTABLISHMENT_KINDS),
  };
};

export const genUserApi = (establishmentId: string): UserApi => {
  return {
    id: uuidv4(),
    email: genEmail(),
    password: randomstring.generate(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    establishmentId,
    role: UserRoles.Usual,
    activatedAt: new Date(),
    phone: faker.phone.number(),
    position: faker.person.jobType(),
    timePerWeek: randomstring.generate(),
    lastAuthenticatedAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
    ...genUserAccountDTO,
  };
};

export const genUserAccountDTO: UserAccountDTO = {
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  phone: faker.phone.number(),
  position: faker.person.jobType(),
  timePerWeek: randomstring.generate(),
};

export const genProspectApi = (
  establishment: EstablishmentApi
): ProspectApi => {
  return {
    email: genEmail(),
    establishment: {
      id: establishment.id,
      siren: establishment.siren,
      campaignIntent: establishment.campaignIntent,
    },
    hasAccount: true,
    hasCommitment: true,
    lastAccountRequestAt: new Date(),
  };
};

export const genOwnerProspectApi = (geoCode?: string): OwnerProspectApi => {
  return {
    id: uuidv4(),
    email: genEmail(),
    firstName: randomstring.generate(),
    lastName: randomstring.generate(),
    address: randomstring.generate(),
    geoCode: geoCode ?? genGeoCode(),
    notes: randomstring.generate(),
    phone: randomstring.generate(),
    invariant: randomstring.generate(),
    callBack: true,
    read: false,
    createdAt: new Date(),
  };
};

export const genOwnerApi = (): OwnerApi => {
  const id = uuidv4();
  return {
    id,
    rawAddress: [
      faker.location.streetAddress(),
      `${faker.location.zipCode()}, ${faker.location.city()}`,
    ],
    // Get the start of the day to avoid time zone issues
    birthDate: faker.date.birthdate(),
    fullName: faker.person.fullName(),
    email: genEmail(),
    phone: faker.phone.number(),
    kind: randomstring.generate(),
    kindDetail: randomstring.generate(),
    additionalAddress: randomstring.generate(),
  };
};

export const genAddressApi = (
  refId: string,
  addressKind: AddressKinds
): AddressApi => {
  return {
    refId,
    addressKind,
    houseNumber: faker.location.buildingNumber(),
    street: faker.location.street(),
    postalCode: faker.location.zipCode(),
    city: faker.location.city(),
    latitude: faker.address.latitude(),
    longitude: faker.address.longitude(),
    score: Math.random(),
  };
};

export const genHousingOwnerApi = (
  housing: HousingApi,
  owner: OwnerApi
): HousingOwnerApi => ({
  ...owner,
  housingGeoCode: housing.geoCode,
  housingId: housing.id,
  rank: genNumber(1),
});

export const genBuildingApi = (housingList: HousingApi[]): BuildingApi => {
  return {
    id:
      housingList.map((housing) => housing.buildingId).reduce(firstDefined) ??
      uuidv4(),
    housingCount: housingList.length,
    vacantHousingCount: housingList.filter(
      (housing) => housing.occupancy === OccupancyKindApi.Vacant
    ).length,
  };
};

export const genHousingApi = (
  geoCode: string = genGeoCode()
): MarkRequired<HousingApi, 'owner'> => {
  const id = uuidv4();
  const department = geoCode.substring(0, 2);
  const locality = geoCode.substring(2, 5);
  const invariant = genInvariant(locality);
  return {
    id,
    invariant,
    localId: genLocalId(department, invariant),
    rawAddress: [
      faker.location.streetAddress(),
      `${geoCode} ${faker.location.city()}`,
    ],
    geoCode,
    localityKind: randomstring.generate(),
    owner: genOwnerApi(),
    coowners: [],
    livingArea: genNumber(4),
    cadastralClassification: genNumber(1),
    uncomfortable: false,
    vacancyStartYear: faker.date.past().getUTCFullYear(),
    housingKind: randomstring.generate(),
    roomsCount: genNumber(1),
    cadastralReference: randomstring.generate(),
    buildingYear: faker.date.past().getUTCFullYear(),
    taxed: false,
    vacancyReasons: [],
    dataYears: [2022],
    buildingLocation: randomstring.generate(),
    ownershipKind: OwnershipKindsApi.Single,
    status: HousingStatusApi.NeverContacted,
    energyConsumption: oneOf(ENERGY_CONSUMPTION_GRADES),
    occupancy: OccupancyKindApi.Vacant,
    occupancyRegistered: OccupancyKindApi.Vacant,
    buildingVacancyRate: genNumber(2),
    campaignIds: [],
    contactCount: genNumber(1),
    source: faker.helpers.arrayElement(HOUSING_SOURCES),
    mutationDate: faker.date.past(),
  };
};

export const genCampaignApi = (
  establishmentId: string,
  createdBy: string,
  group?: GroupApi
): CampaignApi => {
  return {
    id: uuidv4(),
    establishmentId,
    title: randomstring.generate(),
    status: 'draft',
    filters: {
      geoPerimetersIncluded: [randomstring.generate()],
      geoPerimetersExcluded: [randomstring.generate()],
    },
    createdAt: new Date().toJSON(),
    userId: createdBy,
    groupId: group?.id,
  };
};

export function genGeoPerimeterApi(establishment: string): GeoPerimeterApi {
  return {
    id: uuidv4(),
    establishmentId: establishment,
    name: randomstring.generate(),
    kind: randomstring.generate(),
    geoJson: turf.multiPolygon([
      turf.bboxPolygon(turf.square([0, 48, 2, 50])).geometry.coordinates,
    ]).geometry,
  };
}

export const genResetLinkApi = (userId: string): ResetLinkApi => {
  return {
    id: randomstring.generate({
      length: RESET_LINK_LENGTH,
      charset: 'alphanumeric',
    }),
    userId,
    createdAt: new Date(),
    expiresAt: addHours(new Date(), RESET_LINK_EXPIRATION),
    usedAt: null,
  };
};

export const genSignupLinkApi = (prospectEmail: string): SignupLinkApi => ({
  id: randomstring.generate({
    length: SIGNUP_LINK_LENGTH,
    charset: 'alphanumeric',
  }),
  prospectEmail,
  expiresAt: addHours(new Date(), SIGNUP_LINK_EXPIRATION),
});

export const genContactPointApi = (
  establishmentId: string
): ContactPointApi => {
  return {
    id: uuidv4(),
    establishmentId,
    title: randomstring.generate(),
    opening: randomstring.generate(),
    address: `${faker.location.streetAddress()}, ${faker.location.zipCode()} ${faker.location.city()}`,
    email: genEmail(),
    geoCodes: [genGeoCode()],
  };
};

export const genSettingsApi = (establishmentId: string): SettingsApi => {
  return {
    id: uuidv4(),
    establishmentId,
    contactPoints: {
      public: genBoolean(),
    },
    inbox: {
      enabled: true,
    },
  };
};

function genEventApi<T>(createdBy: string): EventApi<T> {
  return {
    id: uuidv4(),
    name: randomstring.generate(),
    kind: oneOf(EventKinds),
    category: oneOf(EventCategories),
    section: oneOf(EventSections),
    conflict: genBoolean(),
    createdAt: new Date(),
    createdBy,
  };
}

export const genOwnerEventApi = (
  ownerId: string,
  createdBy: string
): OwnerEventApi => {
  return {
    ...genEventApi<OwnerApi>(createdBy),
    old: { ...genOwnerApi(), id: ownerId },
    new: { ...genOwnerApi(), id: ownerId },
    ownerId,
  };
};

export const genHousingEventApi = (
  housing: HousingApi,
  createdBy: UserApi
): HousingEventApi => {
  return {
    ...genEventApi<HousingApi>(createdBy.id),
    old: housing,
    new: { ...genHousingApi(housing.geoCode), id: housing.id },
    housingId: housing.id,
    housingGeoCode: housing.geoCode,
  };
};

export const genGroupHousingEventApi = (
  housing: HousingApi,
  group: GroupApi,
  createdBy: UserApi
): GroupHousingEventApi => {
  return {
    ...genEventApi<GroupApi>(createdBy.id),
    old: group,
    new: group,
    groupId: group.id,
    housingId: housing.id,
    housingGeoCode: housing.geoCode,
  };
};

export const genGroupApi = (
  creator: UserApi,
  establishment: EstablishmentApi
): GroupApi => {
  return {
    id: uuidv4(),
    title: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    housingCount: 0,
    ownerCount: 0,
    createdAt: new Date(),
    userId: creator.id,
    createdBy: creator,
    establishmentId: establishment.id,
    exportedAt: null,
    archivedAt: null,
  };
};

export const genDatafoncierOwner = (
  idprocpte = randomstring.generate(11)
): DatafoncierOwner => {
  const idcom = genGeoCode();
  return {
    idprodroit: `01${idprocpte}`,
    idprocpte,
    idpersonne: randomstring.generate(8),
    idvoie: randomstring.generate(9),
    idcom,
    idcomtxt: faker.location.city(),
    ccodep: idcom.substring(0, 2),
    ccodir: randomstring.generate(1),
    ccocom: idcom.substring(2, 5),
    dnupro: randomstring.generate(6),
    dnulp: randomstring.generate({
      length: 1,
      charset: 'numeric',
    }),
    ccocif: randomstring.generate(4),
    dnuper: randomstring.generate(6),
    ccodro: randomstring.generate(1),
    ccodrotxt: randomstring.generate(64),
    typedroit: randomstring.generate(1),
    ccodem: randomstring.generate(1),
    ccodemtxt: randomstring.generate(28),
    gdesip: randomstring.generate(1),
    gtoper: randomstring.generate(1),
    ccoqua: randomstring.generate(1),
    dnatpr: randomstring.generate(3),
    dnatprtxt: randomstring.generate(53),
    ccogrm: randomstring.generate(2),
    ccogrmtxt: randomstring.generate(46),
    dsglpm: randomstring.generate(10),
    dforme: randomstring.generate(4),
    ddenom: faker.person.fullName().substring(0, 60),
    gtyp3: randomstring.generate(1),
    gtyp4: randomstring.generate(1),
    gtyp5: randomstring.generate(1),
    gtyp6: randomstring.generate(1),
    dlign3: [
      faker.location.buildingNumber().substring(0, 4),
      faker.location.street(),
    ]
      .join(' ')
      .substring(0, 30),
    dlign4: [idcom, faker.location.city()].join(' ').substring(0, 30),
    dlign5: null,
    dlign6: null,
    ccopay: randomstring.generate(3),
    ccodep1a2: randomstring.generate(2),
    ccodira: randomstring.generate(1),
    ccocomadr: randomstring.generate(3),
    ccovoi: randomstring.generate(5),
    ccoriv: randomstring.generate(4),
    dnvoiri: randomstring.generate(4),
    dindic: randomstring.generate(1),
    ccopos: randomstring.generate(5),
    dqualp: randomstring.generate(3),
    dnomlp: randomstring.generate(30),
    dprnlp: randomstring.generate(15),
    jdatnss: faker.date
      .birthdate()
      .toISOString()
      .substring(0, 10)
      .split('-')
      .reverse()
      .join('/'),
    dldnss: randomstring.generate(58),
    dsiren: randomstring.generate(9),
    topja: randomstring.generate(1),
    datja: randomstring.generate(8),
    dformjur: randomstring.generate(4),
    dnomus: randomstring.generate(60),
    dprnus: randomstring.generate(40),
    locprop: randomstring.generate(1),
    locproptxt: randomstring.generate(21),
    catpro2: randomstring.generate(2),
    catpro2txt: randomstring.generate(100),
    catpro3: randomstring.generate(3),
    catpro3txt: randomstring.generate(105),
    idpk: genNumber(5),
  };
};

export const genDatafoncierHousing = (
  geoCode = genGeoCode()
): DatafoncierHousing => {
  const department = geoCode.substring(0, 2);
  const localityCode = geoCode.substring(2, 5);
  const invariant = genInvariant(localityCode);
  const localId = genLocalId(department, invariant);
  return {
    idlocal: localId,
    idbat: randomstring.generate(16),
    idpar: randomstring.generate(14),
    idtup: randomstring.generate(),
    idsec: randomstring.generate(10),
    idvoie: randomstring.generate(9),
    idprocpte: randomstring.generate(11),
    idcom: geoCode,
    idcomtxt: faker.location.county(),
    ccodep: randomstring.generate(2),
    ccodir: randomstring.generate(1),
    ccocom: localityCode,
    invar: invariant,
    ccopre: randomstring.generate(3),
    ccosec: randomstring.generate(2),
    dnupla: randomstring.generate(4),
    dnubat: randomstring.generate(2),
    descc: randomstring.generate(2),
    dniv: randomstring.generate(2),
    dpor: randomstring.generate(5),
    ccoriv: randomstring.generate(4),
    ccovoi: randomstring.generate(5),
    dnvoiri: faker.location.buildingNumber().substring(0, 4),
    dindic: '',
    ccocif: randomstring.generate(4),
    dvoilib: faker.location.street().substring(0, 30),
    cleinvar: randomstring.generate(1),
    ccpper: randomstring.generate(3),
    gpdl: randomstring.generate(1),
    ctpdl: randomstring.generate(5),
    dnupro: randomstring.generate(6),
    jdatat: randomstring.generate(8),
    jdatatv: randomstring.generate(8),
    jdatatan: genNumber(2),
    dnufnl: randomstring.generate(6),
    ccoeva: randomstring.generate(1),
    ccoevatxt: randomstring.generate(72),
    dteloc: faker.helpers.arrayElement(['1', '2']),
    dteloctxt: oneOf(['MAISON', 'APPARTEMENT']),
    logh: randomstring.generate(1),
    loghmais: randomstring.generate(1),
    loghappt: randomstring.generate(1),
    gtauom: randomstring.generate(2),
    dcomrd: randomstring.generate(3),
    ccoplc: randomstring.generate(1),
    ccoplctxt: randomstring.generate(140),
    cconlc: randomstring.generate(2),
    cconlctxt: randomstring.generate(43),
    dvltrt: genNumber(2),
    cc48lc: randomstring.generate(2),
    dloy48a: genNumber(2),
    top48a: randomstring.generate(1),
    dnatlc: randomstring.generate(1),
    ccthp: oneOf(['L', 'V']),
    proba_rprs: randomstring.generate(7),
    typeact: randomstring.generate(4),
    loghvac: randomstring.generate(1),
    loghvac2a: randomstring.generate(1),
    loghvac5a: randomstring.generate(1),
    loghvacdeb: randomstring.generate(5),
    cchpr: randomstring.generate(1),
    jannat: randomstring.generate(4),
    dnbniv: randomstring.generate(2),
    nbetagemax: genNumber(1),
    nbnivssol: genNumber(1),
    hlmsem: randomstring.generate(1),
    loghlls: randomstring.generate(15),
    postel: randomstring.generate(1),
    dnatcg: randomstring.generate(2),
    jdatcgl: randomstring.generate(8),
    fburx: genNumber(1),
    gimtom: randomstring.generate(1),
    cbtabt: randomstring.generate(2),
    jdbabt: randomstring.generate(4),
    jrtabt: randomstring.generate(4),
    cconac: randomstring.generate(5),
    cconactxt: randomstring.generate(129),
    toprev: randomstring.generate(1),
    ccoifp: genNumber(2),
    jannath: genNumber(4),
    janbilmin: genNumber(1),
    npevph: genNumber(1),
    stoth: genNumber(1),
    stotdsueic: genNumber(1),
    npevd: genNumber(1),
    stotd: genNumber(1),
    npevp: genNumber(1),
    sprincp: genNumber(1),
    ssecp: genNumber(1),
    ssecncp: genNumber(1),
    sparkp: genNumber(1),
    sparkncp: genNumber(1),
    npevtot: genNumber(1),
    slocal: genNumber(1),
    npiece_soc: genNumber(1),
    npiece_ff: genNumber(1),
    npiece_i: genNumber(1),
    npiece_p2: genNumber(1),
    nbannexe: genNumber(1),
    nbgarpark: genNumber(1),
    nbagrement: genNumber(1),
    nbterrasse: genNumber(1),
    nbpiscine: genNumber(1),
    ndroit: genNumber(1),
    ndroitindi: genNumber(1),
    ndroitpro: genNumber(1),
    ndroitges: genNumber(1),
    catpro2: randomstring.generate(20),
    catpro2txt: randomstring.generate(200),
    catpro3: randomstring.generate(30),
    catpropro2: randomstring.generate(20),
    catproges2: randomstring.generate(30),
    locprop: randomstring.generate(1),
    locproptxt: randomstring.generate(21),
    source_geo: randomstring.generate(34),
    vecteur: randomstring.generate(1),
    ban_id: randomstring.generate(30),
    ban_geom: null,
    ban_type: randomstring.generate(15),
    ban_score: Math.random().toString(),
    geomloc: null,
    idpk: null,
    code_epci: null,
    lib_epci: null,
    ban_cp: randomstring.generate(5),
    dis_ban_ff: genNumber(1),
  };
};

export const genOwnerMatch = (
  datafoncierOwner: DatafoncierOwner,
  owner: OwnerApi
): OwnerMatchDBO => ({
  owner_id: owner.id,
  idpersonne: datafoncierOwner.idpersonne,
});

export const genConflictApi = <T>(
  existing: T,
  replacement: T
): ConflictApi<T> => ({
  id: uuidv4(),
  createdAt: new Date(),
  existing,
  replacement,
});

export const genOwnerConflictApi = (): OwnerConflictApi =>
  genConflictApi(genOwnerApi(), genOwnerApi()) as OwnerConflictApi;

export const genHousingOwnerConflictApi = (
  housing: HousingApi,
  existing: HousingOwnerApi,
  replacement: HousingOwnerApi
): HousingOwnerConflictApi => ({
  ...genConflictApi(existing, replacement),
  housingGeoCode: housing.geoCode,
  housingId: housing.id,
});

const genNoteApi = (creator: UserApi): NoteApi => ({
  id: uuidv4(),
  noteKind: faker.word.noun(),
  content: faker.lorem.paragraph(),
  createdBy: creator.id,
  createdAt: faker.date.past(),
});

export const genHousingNoteApi = (
  creator: UserApi,
  housing: HousingApi
): HousingNoteApi => ({
  ...genNoteApi(creator),
  housingGeoCode: housing.geoCode,
  housingId: housing.id,
});

export function genDraftApi(
  establishment: EstablishmentApi,
  sender: SenderApi
): DraftApi {
  return {
    id: uuidv4(),
    subject: faker.lorem.sentence(),
    body: faker.lorem.paragraph(),
    logo: faker.helpers.multiple(() => faker.image.url(), {
      count: { min: 1, max: 2 },
    }),
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON(),
    sender,
    senderId: sender.id,
    writtenAt: faker.date.recent().toJSON().substring(0, 'yyyy-mm-dd'.length),
    writtenFrom: faker.location.streetAddress({ useFullAddress: true }),
    establishmentId: establishment.id,
  };
}

export function genSenderApi(establishment: EstablishmentApi): SenderApi {
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();
  return {
    id: uuidv4(),
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
    updatedAt: faker.date.recent().toJSON(),
    establishmentId: establishment.id,
  };
}
