import { faker } from '@faker-js/faker/locale/fr';
import { UserApi, UserRoles } from '../models/UserApi';
import { OwnerApi } from '../models/OwnerApi';
import { v4 as uuidv4 } from 'uuid';
import { EstablishmentApi } from '../models/EstablishmentApi';
import { addHours } from 'date-fns';
import {
  EnergyConsumptionGradesApi,
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
import { EventApi, HousingEventApi, OwnerEventApi } from '../models/EventApi';
import { EventKinds } from '../../shared/types/EventKind';
import { EventCategories } from '../../shared/types/EventCategory';
import { EventSections } from '../../shared/types/EventSection';
import { UserAccountDTO } from '../../shared/models/UserDTO';
import { GroupApi } from '../models/GroupApi';
import { DatafoncierOwner } from '../../scripts/shared';
import { HousingOwnerApi } from '../models/HousingOwnerApi';
import { MarkRequired } from 'ts-essentials';
import { OwnerMatchDBO } from '../repositories/ownerMatchRepository';
import {
  ConflictApi,
  HousingOwnerConflictApi,
  OwnerConflictApi,
} from '../models/ConflictApi';
import { DatafoncierHousing, HOUSING_SOURCES } from '../../shared';
import { logger } from '../utils/logger';

logger.debug(`Seed: ${faker.seed()}`);

const randomstring = require('randomstring');

export const genEmail = () => {
  return (
    randomstring.generate({
      length: 10,
      charset: 'alphabetic',
    }) +
    '@' +
    randomstring.generate({
      length: 10,
      charset: 'alphabetic',
    }) +
    '.' +
    randomstring.generate({
      length: 2,
      charset: 'alphabetic',
    })
  );
};

export const genGeoCode = (): string => {
  const geoCode = faker.location.zipCode();
  const needsReroll =
    geoCode.startsWith('00') ||
    geoCode.startsWith('20') ||
    geoCode.startsWith('99') ||
    geoCode.endsWith('999');
  return needsReroll ? genGeoCode() : geoCode;
};

export const genNumber = (length = 10) => {
  return Number(
    randomstring.generate({
      length,
      charset: 'numeric',
    })
  );
};

export const genBoolean = () => Math.random() < 0.5;

export const genSiren = () => genNumber(9);
export function oneOf<T>(array: Array<T>): T {
  return array[Math.floor(Math.random() * array.length)];
}

export const genLocalityApi = (geoCode = genGeoCode()): LocalityApi => {
  return {
    id: uuidv4(),
    geoCode,
    name: randomstring.generate(),
    taxKind: TaxKindsApi.None,
  };
};

export const genEstablishmentApi = (...geoCodes: string[]) => {
  return <EstablishmentApi>{
    id: uuidv4(),
    name: randomstring.generate(),
    siren: genSiren(),
    geoCodes,
  };
};

export const genUserApi = (establishmentId: string): UserApi => {
  return {
    id: uuidv4(),
    email: genEmail(),
    password: randomstring.generate(),
    firstName: randomstring.generate(),
    lastName: randomstring.generate(),
    establishmentId,
    role: UserRoles.Usual,
    activatedAt: new Date(),
    phone: randomstring.generate({ length: 10, charset: 'numeric' }),
    position: randomstring.generate(),
    timePerWeek: randomstring.generate(),
    lastAuthenticatedAt: new Date(),
    updatedAt: new Date(),
    deletedAt: undefined,
    ...genUserAccountDTO,
  };
};

export const genUserAccountDTO: UserAccountDTO = {
  firstName: randomstring.generate(),
  lastName: randomstring.generate(),
  phone: randomstring.generate(),
  position: randomstring.generate(),
  timePerWeek: randomstring.generate(),
};

export const genProspectApi = (establishment: EstablishmentApi) => {
  return <ProspectApi>{
    email: genEmail(),
    establishment: {
      id: establishment.id,
      siren: establishment.siren,
      campaignIntent: establishment.campaignIntent ?? null,
    },
    hasAccount: true,
    hasCommitment: true,
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
  return {
    id: uuidv4(),
    rawAddress: [randomstring.generate(), randomstring.generate()],
    // Get the start of the day to avoid time zone issues
    birthDate: new Date(new Date().toISOString().substring(0, 10)),
    fullName: randomstring.generate(),
    email: genEmail(),
    phone: randomstring.generate(),
    kind: randomstring.generate(),
    kindDetail: randomstring.generate(),
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

export const genLocalId = (geoCode: string): string =>
  `${geoCode}${randomstring.generate({ length: 7, charset: 'numeric' })}`;

export const genHousingApi = (
  geoCode: string = genGeoCode()
): MarkRequired<HousingApi, 'owner'> => {
  const id = uuidv4();
  return {
    id,
    invariant: randomstring.generate(),
    localId: genLocalId(geoCode),
    rawAddress: [randomstring.generate(), randomstring.generate()],
    geoCode,
    localityKind: randomstring.generate(),
    owner: genOwnerApi(),
    coowners: [],
    livingArea: genNumber(4),
    cadastralClassification: genNumber(1),
    uncomfortable: false,
    vacancyStartYear: 1000 + genNumber(3),
    housingKind: randomstring.generate(),
    roomsCount: genNumber(1),
    cadastralReference: randomstring.generate(),
    buildingYear: genNumber(4),
    taxed: false,
    vacancyReasons: [],
    dataYears: [2022],
    buildingLocation: randomstring.generate(),
    ownershipKind: OwnershipKindsApi.Single,
    status: HousingStatusApi.NeverContacted,
    energyConsumption: EnergyConsumptionGradesApi.A,
    occupancy: OccupancyKindApi.Vacant,
    occupancyRegistered: OccupancyKindApi.Vacant,
    buildingVacancyRate: genNumber(2),
    campaignIds: [],
    contactCount: genNumber(1),
    source: faker.helpers.arrayElement(HOUSING_SOURCES),
  };
};

export const genCampaignApi = (establishmentId: string, createdBy: string) => {
  return <CampaignApi>{
    id: uuidv4(),
    establishmentId,
    title: randomstring.generate(),
    filters: {
      geoPerimetersIncluded: [randomstring.generate()],
      geoPerimetersExcluded: [randomstring.generate()],
    },
    housingCount: genNumber(2),
    ownerCount: genNumber(2),
    kind: 1,
    createdAt: new Date(),
    createdBy,
    sendingDate: new Date(),
  };
};

export const genGeoPerimeterApi = (establishmentId: string) => {
  return <GeoPerimeterApi>{
    id: uuidv4(),
    establishmentId,
    name: randomstring.generate(),
    kind: randomstring.generate(),
  };
};

export const genResetLinkApi = (userId: string) => {
  return <ResetLinkApi>{
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

export const genContactPointApi = (establishmentId: string) => {
  return <ContactPointApi>{
    id: uuidv4(),
    establishmentId,
    title: randomstring.generate(),
    opening: randomstring.generate(),
    address: randomstring.generate(),
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
  housingId: string,
  createdBy: string
): HousingEventApi => {
  const geoCode = genGeoCode();
  return {
    ...genEventApi<HousingApi>(createdBy),
    old: { ...genHousingApi(geoCode), id: housingId },
    new: { ...genHousingApi(geoCode), id: housingId },
    housingId,
    housingGeoCode: geoCode,
  };
};

export const genGroupApi = (
  creator: UserApi,
  establishment: EstablishmentApi
): GroupApi => {
  return {
    id: uuidv4(),
    title: randomstring.generate(),
    description: randomstring.generate(),
    housingCount: 0,
    ownerCount: 0,
    createdAt: new Date(),
    userId: creator.id,
    createdBy: creator,
    establishmentId: establishment.id,
    archivedAt: null,
  };
};

export const genDatafoncierOwner = (
  idprocpte = randomstring.generate(11)
): DatafoncierOwner => {
  const idcom = genGeoCode();
  return {
    idprodroit: randomstring.generate(13),
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

export const genDatafoncierHousing = (): DatafoncierHousing => {
  const idcom = genGeoCode();
  const localId = genLocalId(idcom);
  return {
    idlocal: genLocalId(idcom),
    idbat: randomstring.generate(16),
    idpar: randomstring.generate(14),
    idtup: randomstring.generate(),
    idsec: randomstring.generate(10),
    idvoie: randomstring.generate(9),
    idprocpte: randomstring.generate(11),
    idcom,
    idcomtxt: faker.location.county(),
    ccodep: randomstring.generate(2),
    ccodir: randomstring.generate(1),
    ccocom: randomstring.generate(3),
    invar: localId.substring(idcom.length),
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
    ban_type: randomstring.generate(15),
    ban_score: Math.random(),
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
