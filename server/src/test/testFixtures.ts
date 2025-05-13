import { faker } from '@faker-js/faker/locale/fr';
import * as turf from '@turf/turf';
import {
  ACTIVE_OWNER_RANKS,
  AddressKinds,
  CADASTRAL_CLASSIFICATION_VALUES,
  DatafoncierHousing,
  ENERGY_CONSUMPTION_VALUES,
  ESTABLISHMENT_KIND_VALUES,
  EVENT_CATEGORY_VALUES,
  EVENT_KIND_VALUES,
  EVENT_SECTION_VALUES,
  HOUSING_KIND_VALUES,
  HOUSING_SOURCE_VALUES,
  INTERNAL_CO_CONDOMINIUM_VALUES,
  INTERNAL_MONO_CONDOMINIUM_VALUES,
  LOCALITY_KIND_VALUES,
  Occupancy,
  OCCUPANCY_VALUES,
  OWNER_ENTITY_VALUES,
  OWNER_KIND_LABELS,
  PROPERTY_RIGHT_VALUES,
  UserAccountDTO
} from '@zerologementvacant/models';

import { genGeoCode } from '@zerologementvacant/models/fixtures';
import { addHours } from 'date-fns';
import type { BBox } from 'geojson';
import fp from 'lodash/fp';
import randomstring from 'randomstring';
import { MarkRequired } from 'ts-essentials';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '~/infra/logger';
import { AddressApi } from '~/models/AddressApi';
import { BuildingApi } from '~/models/BuildingApi';
import { CampaignApi } from '~/models/CampaignApi';
import {
  ConflictApi,
  HousingOwnerConflictApi,
  OwnerConflictApi
} from '~/models/ConflictApi';
import { ContactPointApi } from '~/models/ContactPointApi';
import { DraftApi } from '~/models/DraftApi';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import {
  EventApi,
  GroupHousingEventApi,
  HousingEventApi,
  OwnerEventApi
} from '~/models/EventApi';
import { GeoPerimeterApi } from '~/models/GeoPerimeterApi';
import { GroupApi } from '~/models/GroupApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import {
  HOUSING_STATUS_VALUES,
  HousingStatusApi
} from '~/models/HousingStatusApi';
import { LocalityApi, TaxKindsApi } from '~/models/LocalityApi';
import { HousingNoteApi, NoteApi } from '~/models/NoteApi';
import { OwnerApi } from '~/models/OwnerApi';
import { OwnerProspectApi } from '~/models/OwnerProspectApi';
import { ProspectApi } from '~/models/ProspectApi';
import {
  RESET_LINK_EXPIRATION,
  RESET_LINK_LENGTH,
  ResetLinkApi
} from '~/models/ResetLinkApi';
import { SenderApi } from '~/models/SenderApi';
import { SettingsApi } from '~/models/SettingsApi';
import {
  SIGNUP_LINK_EXPIRATION,
  SIGNUP_LINK_LENGTH,
  SignupLinkApi
} from '~/models/SignupLinkApi';
import { UserApi, UserRoles } from '~/models/UserApi';
import { OwnerMatchDBO } from '~/repositories/ownerMatchRepository';
import { DatafoncierOwner } from '~/scripts/shared';

logger.debug(`Seed: ${faker.seed()}`);

export const genEmail = () => faker.internet.email();

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
      charset: 'numeric'
    })
  );
};

export const genBoolean = () => faker.datatype.boolean();

export const genSiren = () => genNumber(9).toString();
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
    kind: faker.helpers.arrayElement([null, ...LOCALITY_KIND_VALUES]),
    taxKind: TaxKindsApi.None
  };
};

export const genEstablishmentApi = (
  ...geoCodes: string[]
): EstablishmentApi => {
  const city = faker.location.city();
  return {
    id: uuidv4(),
    name: city,
    shortName: city,
    siren: genSiren().toString(),
    geoCodes: geoCodes.length > 0 ? geoCodes : [genGeoCode()],
    available: true,
    kind: faker.helpers.arrayElement(ESTABLISHMENT_KIND_VALUES),
    source: 'seed'
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
    activatedAt: faker.date.recent(),
    phone: faker.phone.number(),
    position: faker.person.jobType(),
    timePerWeek: randomstring.generate(),
    lastAuthenticatedAt: faker.date.recent(),
    updatedAt: faker.date.recent(),
    deletedAt: undefined
  };
};

export const genUserAccountDTO: UserAccountDTO = {
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  phone: faker.phone.number(),
  position: faker.person.jobType(),
  timePerWeek: randomstring.generate()
};

export const genProspectApi = (
  establishment: EstablishmentApi
): ProspectApi => {
  return {
    email: genEmail(),
    establishment: {
      id: establishment.id,
      siren: establishment.siren
    },
    hasAccount: true,
    hasCommitment: true,
    lastAccountRequestAt: new Date()
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
    createdAt: new Date()
  };
};

export const genOwnerApi = (): OwnerApi => {
  const id = uuidv4();
  return {
    id,
    idpersonne:
      faker.string.numeric(2) +
      faker.string.alphanumeric({ length: 6, casing: 'upper' }),
    rawAddress: [
      faker.location.streetAddress(),
      `${faker.location.zipCode()}, ${faker.location.city()}`
    ],
    // Get the start of the day to avoid time zone issues
    birthDate:
      faker.helpers.maybe(() => faker.date.birthdate().toJSON()) ?? null,
    fullName: faker.person.fullName(),
    email: genEmail(),
    phone: faker.phone.number(),
    kind: faker.helpers.arrayElement([
      null,
      ...Object.values(OWNER_KIND_LABELS)
    ]),
    kindDetail: randomstring.generate(),
    additionalAddress: randomstring.generate(),
    entity: faker.helpers.arrayElement(OWNER_ENTITY_VALUES)
  };
};

export const genAddressApi = (
  refId: string,
  addressKind: AddressKinds
): AddressApi => {
  const houseNumber = faker.location.buildingNumber();
  const street = faker.location.street();
  const postalCode = faker.location.zipCode();
  const city = faker.location.city();
  const address = `${houseNumber} ${street} ${postalCode} ${city}`;
  return {
    refId,
    addressKind,
    banId: faker.string.numeric(16),
    label: address,
    houseNumber,
    street,
    postalCode,
    city,
    latitude: faker.location.latitude({
      min: FRANCE_BBOX[1],
      max: FRANCE_BBOX[3]
    }),
    longitude: faker.location.longitude({
      min: FRANCE_BBOX[0],
      max: FRANCE_BBOX[2]
    }),
    score: faker.number.float({ min: 0, max: 1, fractionDigits: 2 }),
    lastUpdatedAt: faker.date.recent().toJSON()
  };
};

export const genHousingOwnerApi = (
  housing: HousingApi,
  owner: OwnerApi
): HousingOwnerApi => ({
  ...owner,
  ownerId: owner.id,
  housingGeoCode: housing.geoCode,
  housingId: housing.id,
  rank: faker.helpers.arrayElement(ACTIVE_OWNER_RANKS),
  origin: 'lovac',
  idprocpte: faker.string.alphanumeric(11),
  idprodroit: faker.string.alphanumeric(13),
  locprop: faker.number.int({ min: 1, max: 10 }),
  propertyRight: faker.helpers.arrayElement(PROPERTY_RIGHT_VALUES),
  startDate: faker.date.past()
});

export function genBuildingApi(): BuildingApi {
  const geoCode = genGeoCode();
  const housingCount = faker.number.int({ min: 1, max: 10 });
  const vacantHousingCount = faker.number.int({ min: 0, max: housingCount });
  const rentHousingCount = faker.number.int({
    min: housingCount - vacantHousingCount,
    max: housingCount
  });

  return {
    id: geoCode + faker.string.sample(7),
    housingCount,
    vacantHousingCount,
    rentHousingCount,
    rnbId: faker.string.alphanumeric({ casing: 'upper' }),
    rnbIdScore: faker.helpers.arrayElement([0, 1, 2, 3, 8, 9])
  };
}

export const genHousingApi = (
  geoCode: string = genGeoCode(),
  building?: BuildingApi
): MarkRequired<HousingApi, 'owner'> => {
  const id = uuidv4();
  const department = geoCode.substring(0, 2);
  const locality = geoCode.substring(2, 5);
  const invariant = genInvariant(locality);
  const dataYears = faker.helpers.arrayElements(
    fp.range(2019, new Date().getUTCFullYear() + 1),
    {
      min: 1,
      max: new Date().getUTCFullYear() + 1 - 2019
    }
  );
  const dataFileYears = dataYears
    .map((year) => `lovac-${year}`)
    .concat(
      faker.helpers.maybe(() => 'ff-2023', {
        probability: 0.2
      }) ?? []
    )
    .toSorted();

  return {
    id,
    invariant,
    localId: genLocalId(department, invariant),
    rawAddress: [
      faker.location.streetAddress(),
      `${geoCode} ${faker.location.city()}`
    ],
    latitude: faker.location.latitude({
      min: FRANCE_BBOX[1],
      max: FRANCE_BBOX[3]
    }),
    longitude: faker.location.longitude({
      min: FRANCE_BBOX[0],
      max: FRANCE_BBOX[2]
    }),
    geoCode,
    localityKind: faker.helpers.maybe(
      () => faker.helpers.arrayElement(['ACV', 'PVD']),
      { probability: 0.2 }
    ),
    owner: genOwnerApi(),
    livingArea: faker.number.int({ min: 10, max: 300 }),
    cadastralClassification: faker.helpers.arrayElement([
      null,
      ...CADASTRAL_CLASSIFICATION_VALUES
    ]),
    uncomfortable: faker.datatype.boolean(),
    vacancyStartYear: faker.date.past({ years: 20 }).getUTCFullYear(),
    housingKind: faker.helpers.arrayElement(HOUSING_KIND_VALUES),
    roomsCount: faker.number.int({ min: 0, max: 10 }),
    cadastralReference: randomstring.generate(),
    buildingYear: faker.date.past({ years: 100 }).getUTCFullYear(),
    taxed: faker.datatype.boolean(),
    deprecatedVacancyReasons: [],
    dataYears,
    dataFileYears,
    buildingLocation: randomstring.generate(),
    ownershipKind:
      faker.helpers.maybe(() =>
        faker.helpers.arrayElement([
          ...INTERNAL_MONO_CONDOMINIUM_VALUES,
          ...INTERNAL_CO_CONDOMINIUM_VALUES
        ])
      ) ?? null,
    status: faker.helpers.weightedArrayElement([
      {
        value: HousingStatusApi.NeverContacted,
        weight: HOUSING_STATUS_VALUES.length - 1
      },
      ...HOUSING_STATUS_VALUES.filter(
        (status) => status !== HousingStatusApi.NeverContacted
      ).map((status) => ({
        value: status,
        weight: 1
      }))
    ]),
    subStatus: null,
    energyConsumption: faker.helpers.arrayElement([
      null,
      ...ENERGY_CONSUMPTION_VALUES
    ]),
    energyConsumptionAt: faker.helpers.maybe(() => faker.date.past()) ?? null,
    occupancy: faker.helpers.arrayElement(OCCUPANCY_VALUES),
    occupancyRegistered: faker.helpers.arrayElement(OCCUPANCY_VALUES),
    occupancyIntended: faker.helpers.arrayElement(OCCUPANCY_VALUES),
    buildingVacancyRate: faker.number.float(),
    campaignIds: [],
    contactCount: genNumber(1),
    source: faker.helpers.arrayElement(HOUSING_SOURCE_VALUES),
    mutationDate: faker.date.past({ years: 20 }),
    geolocation: null,
    plotId: null,
    beneficiaryCount: null,
    buildingId: building?.id ?? null,
    buildingGroupId: null,
    buildingHousingCount: null,
    geoPerimeters: [],
    lastContact: null,
    precisions: [],
    rentalValue: faker.number.int({ min: 500, max: 1000 }),
    deprecatedPrecisions: [],
    lastMutationDate:
      faker.helpers.maybe(() => faker.date.past({ years: 20 })) ?? null,
    lastTransactionDate:
      faker.helpers.maybe(() => faker.date.past({ years: 20 })) ?? null,
    lastTransactionValue:
      faker.helpers.maybe(() => Number(faker.finance.amount({ dec: 0 }))) ??
      null
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
    description: randomstring.generate(),
    status: 'draft',
    filters: {
      geoPerimetersIncluded: [randomstring.generate()],
      geoPerimetersExcluded: [randomstring.generate()]
    },
    createdAt: new Date().toJSON(),
    userId: createdBy,
    groupId: group?.id
  };
};

export const FRANCE_BBOX: BBox = [-1.69, 43.19, 6.8, 49.49];

export const genGeoPerimeterApi = (
  establishmentId: string,
  creator: UserApi
): GeoPerimeterApi => {
  return {
    id: uuidv4(),
    establishmentId,
    geometry: turf.multiPolygon(
      turf
        .randomPolygon(1, {
          bbox: FRANCE_BBOX,
          max_radial_length: 3
        })
        .features.map((feature) => {
          return feature.geometry.coordinates;
        })
    ).geometry,
    name: faker.helpers.arrayElement([
      'OPAH',
      'OPAH-RU',
      'Zone Commerciale Linéaire'
    ]),
    kind: randomstring.generate(),
    createdAt: faker.date.past().toJSON(),
    createdBy: creator?.id
  };
};

export const genResetLinkApi = (userId: string): ResetLinkApi => {
  return {
    id: randomstring.generate({
      length: RESET_LINK_LENGTH,
      charset: 'alphanumeric'
    }),
    userId,
    createdAt: new Date(),
    expiresAt: addHours(new Date(), RESET_LINK_EXPIRATION),
    usedAt: null
  };
};

export const genSignupLinkApi = (prospectEmail: string): SignupLinkApi => ({
  id: randomstring.generate({
    length: SIGNUP_LINK_LENGTH,
    charset: 'alphanumeric'
  }),
  prospectEmail,
  expiresAt: addHours(new Date(), SIGNUP_LINK_EXPIRATION)
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
    geoCodes: [genGeoCode()]
  };
};

export const genSettingsApi = (establishmentId: string): SettingsApi => {
  return {
    id: uuidv4(),
    establishmentId,
    contactPoints: {
      public: genBoolean()
    },
    inbox: {
      enabled: true
    }
  };
};

function genEventApi<T>(creator: UserApi): EventApi<T> {
  return {
    id: uuidv4(),
    name: randomstring.generate(),
    kind: faker.helpers.arrayElement(EVENT_KIND_VALUES),
    category: faker.helpers.arrayElement(EVENT_CATEGORY_VALUES),
    section: faker.helpers.arrayElement(EVENT_SECTION_VALUES),
    conflict: genBoolean(),
    createdAt: new Date(),
    createdBy: creator.id,
    creator: creator
  };
}

export const genOwnerEventApi = (
  owner: OwnerApi,
  creator: UserApi
): OwnerEventApi => {
  return {
    ...genEventApi<OwnerApi>(creator),
    old: { ...genOwnerApi(), id: owner.id },
    new: { ...genOwnerApi(), id: owner.id },
    ownerId: owner.id
  };
};

export const genHousingEventApi = (
  housing: HousingApi,
  creator: UserApi
): HousingEventApi => {
  return {
    ...genEventApi<HousingApi>(creator),
    old: housing,
    new: { ...genHousingApi(housing.geoCode), id: housing.id },
    housingId: housing.id,
    housingGeoCode: housing.geoCode
  };
};

export const genGroupHousingEventApi = (
  housing: HousingApi,
  group: GroupApi,
  creator: UserApi
): GroupHousingEventApi => {
  return {
    ...genEventApi<GroupApi>(creator),
    old: group,
    new: group,
    groupId: group.id,
    housingId: housing.id,
    housingGeoCode: housing.geoCode
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
    archivedAt: null
  };
};

export const genDatafoncierOwner = (
  idprocpte = randomstring.generate(11),
  rank = 1
): DatafoncierOwner => {
  const idcom = genGeoCode();
  return {
    idprodroit: `${fp.padCharsStart('0', 1, rank.toString(10))}${idprocpte}`,
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
      charset: 'numeric'
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
      faker.location.street()
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
    idpk: genNumber(5)
  };
};

export const genDatafoncierHousing = (
  geoCode = genGeoCode()
): DatafoncierHousing => {
  const department = geoCode.substring(0, 2);
  const localityCode = geoCode.substring(2, 5);
  const invariant = genInvariant(localityCode);
  const localId = genLocalId(department, invariant);
  const birthdate = faker.date
    .past()
    .toJSON()
    .substring(0, 'yyyy-mm-dd'.length)
    .split('-')
    .toReversed()
    .join('');
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
    jdatat: birthdate,
    jdatatv: birthdate,
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
    ccthp: faker.helpers.arrayElement([
      ...OCCUPANCY_VALUES.filter(
        (occupancy) => occupancy !== Occupancy.UNKNOWN
      ),
      null
    ]),
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
    dis_ban_ff: genNumber(1)
  };
};

export const genOwnerMatch = (
  datafoncierOwner: DatafoncierOwner,
  owner: OwnerApi
): OwnerMatchDBO => ({
  owner_id: owner.id,
  idpersonne: datafoncierOwner.idpersonne
});

export const genConflictApi = <T>(
  existing: T,
  replacement: T
): ConflictApi<T> => ({
  id: uuidv4(),
  createdAt: new Date(),
  existing,
  replacement
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
  housingId: housing.id
});

const genNoteApi = (creator: UserApi): NoteApi => ({
  id: uuidv4(),
  noteKind: faker.word.noun(),
  content: faker.lorem.paragraph(),
  createdBy: creator.id,
  creator,
  createdAt: faker.date.past()
});

export const genHousingNoteApi = (
  creator: UserApi,
  housing: HousingApi
): HousingNoteApi => ({
  ...genNoteApi(creator),
  housingGeoCode: housing.geoCode,
  housingId: housing.id
});

export function genDraftApi(
  establishment: Pick<EstablishmentApi, 'id'>,
  sender: SenderApi
): DraftApi {
  return {
    id: uuidv4(),
    subject: faker.lorem.sentence(),
    body: faker.lorem.paragraph(),
    logo: [],
    createdAt: new Date().toJSON(),
    updatedAt: new Date().toJSON(),
    sender,
    senderId: sender.id,
    writtenAt: faker.date.recent().toJSON().substring(0, 'yyyy-mm-dd'.length),
    writtenFrom: faker.location.streetAddress({ useFullAddress: true }),
    establishmentId: establishment.id
  };
}

export function genSenderApi(
  establishment: Pick<EstablishmentApi, 'id'>
): SenderApi {
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
    signatories: [
      {
        firstName: faker.helpers.maybe(() => faker.person.firstName()) ?? null,
        lastName: faker.helpers.maybe(() => faker.person.lastName()) ?? null,
        role: faker.helpers.maybe(() => faker.person.jobTitle()) ?? null,
        file: null
      },
      {
        firstName: faker.helpers.maybe(() => faker.person.firstName()) ?? null,
        lastName: faker.helpers.maybe(() => faker.person.lastName()) ?? null,
        role: faker.helpers.maybe(() => faker.person.jobTitle()) ?? null,
        file: null
      }
    ],
    createdAt: faker.date.past().toJSON(),
    updatedAt: faker.date.recent().toJSON(),
    establishmentId: establishment.id
  };
}
