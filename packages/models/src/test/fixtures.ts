import { faker } from '@faker-js/faker/locale/fr';
import { point } from '@turf/turf';
import { Array, pipe } from 'effect';
import { MarkRequired } from 'ts-essentials';

import type { BBox } from 'geojson';
import { match, Pattern } from 'ts-pattern';
import { AddressDTO } from '../AddressDTO';
import type { BuildingDTO } from '../BuildingDTO';
import { CADASTRAL_CLASSIFICATION_VALUES } from '../CadastralClassification';
import { CAMPAIGN_STATUS_VALUES, CampaignDTO } from '../CampaignDTO';
import { DATA_FILE_YEAR_VALUES } from '../DataFileYear';
import type { DatafoncierHousing } from '../DatafoncierHousing';
import type { DatafoncierOwner } from '../DatafoncierOwner';
import type { DocumentDTO } from '../DocumentDTO';
import { DraftDTO } from '../DraftDTO';
import {
  ENERGY_CONSUMPTION_MATCH_VALUES,
  ENERGY_CONSUMPTION_TYPE_VALUES,
  ENERGY_CONSUMPTION_VALUES
} from '../EnergyConsumption';
import { EstablishmentDTO } from '../EstablishmentDTO';
import { ESTABLISHMENT_KIND_VALUES } from '../EstablishmentKind';
import { ESTABLISHMENT_SOURCE_VALUES } from '../EstablishmentSource';
import { EVENT_NAME_VALUES, EventDTO } from '../EventDTO';
import { EventType } from '../EventType';
import { FileUploadDTO } from '../FileUploadDTO';
import { GroupDTO } from '../GroupDTO';
import { HOUSING_SOURCE_VALUES, HousingDTO } from '../HousingDTO';
import { HOUSING_KIND_VALUES } from '../HousingKind';
import {
  ACTIVE_OWNER_RANKS,
  HousingOwnerDTO,
  type ActiveOwnerRank
} from '../HousingOwnerDTO';
import { HOUSING_STATUS_VALUES, HousingStatus } from '../HousingStatus';
import { MUTATION_TYPE_VALUES } from '../Mutation';
import { NoteDTO } from '../NoteDTO';
import {
  Occupancy,
  OCCUPANCY_VALUES,
  READ_WRITE_OCCUPANCY_VALUES
} from '../Occupancy';
import { OwnerDTO } from '../OwnerDTO';
import { OWNER_KIND_LABELS } from '../OwnerKind';
import {
  INTERNAL_CO_CONDOMINIUM_VALUES,
  INTERNAL_MONO_CONDOMINIUM_VALUES
} from '../OwnershipKind';
import { PROPERTY_RIGHT_VALUES } from '../PropertyRight';
import { ProspectDTO } from '../ProspectDTO';
import { RELATIVE_LOCATION_VALUES } from '../RelativeLocation';
import { SenderDTO, SignatoryDTO } from '../SenderDTO';
import { SignupLinkDTO } from '../SignupLinkDTO';
import { TIME_PER_WEEK_VALUES } from '../TimePerWeek';
import { UserDTO } from '../UserDTO';
import { UserRole } from '../UserRole';

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

export function genDnupro(): string {
  return (
    faker.string.alpha({ length: 1, casing: 'upper' }) + faker.string.numeric(5)
  );
}

export function genIdprocpte(geoCode = genGeoCode()): string {
  return geoCode + genDnupro();
}

export function genIdprodroit(
  idprocpte: string,
  rank: ActiveOwnerRank
): string {
  return idprocpte + rank.toString().padStart(2, '0');
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

export interface GenBuildingDtoOptions {
  hasEnergyConsumption?: boolean;
}

export function genBuildingDTO(options?: GenBuildingDtoOptions): BuildingDTO {
  const hasEnergyConsumption =
    options?.hasEnergyConsumption ??
    faker.datatype.boolean({ probability: 0.8 });

  return {
    id:
      genGeoCode() + faker.string.alphanumeric({ length: 7, casing: 'upper' }),
    housingCount: 0,
    vacantHousingCount: 0,
    rentHousingCount: 0,
    rnb: hasEnergyConsumption
      ? {
          id:
            faker.helpers.maybe(
              () => faker.string.alphanumeric({ casing: 'upper', length: 10 }),
              { probability: 0.9 }
            ) ?? null,
          score: faker.helpers.arrayElement([0, 1, 2, 3, 8, 9])
        }
      : null,
    dpe: hasEnergyConsumption
      ? {
          id: faker.string.alphanumeric({ casing: 'upper', length: 13 }),
          class: faker.helpers.arrayElement(ENERGY_CONSUMPTION_VALUES),
          doneAt: faker.date.past().toJSON().substring(0, 10),
          type: faker.helpers.arrayElement(ENERGY_CONSUMPTION_TYPE_VALUES),
          match: faker.helpers.arrayElement(ENERGY_CONSUMPTION_MATCH_VALUES)
        }
      : null
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

export function genDatafoncierHousing(
  idprocpte: string,
  idbat: BuildingDTO['id']
): DatafoncierHousing {
  const idcom = idprocpte.toUpperCase().substring(0, 5);
  const department = idcom.substring(0, 2);
  const locality = idcom.substring(2, 5);
  const invar = locality + faker.string.numeric(7);
  const idlocal = department + invar;

  return {
    idlocal: idlocal,
    idbat,
    idpar: faker.string.alpha({ length: 14, casing: 'upper' }),
    idtup: faker.string.alpha(),
    idsec: faker.string.alpha({ length: 9, casing: 'upper' }),
    idvoie: faker.string.alpha({ length: 9, casing: 'upper' }),
    idprocpte,
    idcom,
    idcomtxt: faker.location.county(),
    ccodep: faker.string.alpha({ length: 2, casing: 'upper' }),
    ccodir: faker.string.alpha({ length: 1, casing: 'upper' }),
    ccocom: locality,
    invar: invar,
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
    assieft: faker.string.numeric(10),
    ccpper: faker.string.alphanumeric(3),
    codique: faker.string.numeric(7),
    gpdl: faker.string.alphanumeric(1),
    ctpdl: faker.string.alphanumeric(5),
    dnupro: faker.string.alphanumeric(6),
    jdatat: faker.string.alphanumeric(8),
    jdatatv: faker.date
      .past()
      .toISOString()
      .substring(0, 'yyyy-mm-dd'.length)
      .split('-')
      .toReversed()
      .join(''),
    jdatatan: faker.date.past().getUTCFullYear().toString(),
    dnufnl: faker.string.alphanumeric(6),
    ccoeva: faker.string.alphanumeric(1),
    ccoevatxt: faker.string.alphanumeric(72),
    dteloc: faker.helpers.arrayElement(['1', '2']),
    dteloctxt: faker.helpers.arrayElement(['MAISON', 'APPARTEMENT']),
    typeloc: faker.string.alphanumeric(6),
    logh: faker.datatype.boolean(),
    loghmais: faker.datatype.boolean(),
    loghappt: faker.datatype.boolean(),
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
    rppo_rs: faker.string.alphanumeric(7),
    typeact: faker.string.alphanumeric(4),
    loghvac: faker.string.alphanumeric(1),
    loghvac2a: faker.datatype.boolean(),
    loghvac5a: faker.datatype.boolean(),
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
    jannath: faker.date.past().getUTCFullYear().toString(),
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
    ban_geom: point([faker.location.longitude(), faker.location.latitude()])
      .geometry,
    ban_type: faker.string.alphanumeric(15),
    ban_score: faker.number
      .float({ min: 0, max: 1, fractionDigits: 2 })
      .toFixed(2),
    geomloc: point([faker.location.longitude(), faker.location.latitude()])
      .geometry,
    idpk: null,
    ban_cp: faker.string.alphanumeric(5),
    dis_ban_ff: faker.number.int(9),
    rnb_id: faker.string.alphanumeric({ length: 12, casing: 'upper' }),
    rnb_id_score: faker.helpers.arrayElement([
      '0',
      '1',
      '2',
      '3',
      '8',
      '9',
      null
    ]),
    geomrnb: point([faker.location.longitude(), faker.location.latitude()])
      .geometry
  };
}

export function genDatafoncierOwner(idprodroit: string): DatafoncierOwner {
  const idprocpte = idprodroit.slice(0, -2);
  const dnulp = idprodroit.slice(-2);
  const idcom = idprocpte.substring(0, 5);
  // TODO: make it plausible
  const idcomtxt = faker.location.city().toUpperCase();
  const ccodep = idcom.substring(0, 2);
  const ccocom = idcom.substring(2, 5);
  const dnupro = idprocpte.substring(5);
  const dnuper = faker.string.alphanumeric({ length: 6, casing: 'upper' });
  const idpersonne = ccodep + dnuper;
  const ccoriv = faker.string.numeric({ length: 4, allowLeadingZeros: true });
  const idvoie = idcom + ccoriv;
  const ccodro = faker.string.alpha({
    length: 1,
    casing: 'upper',
    exclude: ['I']
  });
  const typedroit = match(ccodro)
    // Propriétaire
    .with('B', 'C', 'F', 'N', 'P', 'V', 'X', () => 'P')
    // Gestionnaire
    .otherwise(() => 'G');
  const ccodem =
    faker.helpers.maybe(() =>
      faker.helpers.arrayElement(['C', 'S', 'L', 'I', 'V'] as const)
    ) ?? null;
  const ccodemtxt = match(ccodem)
    .with('C', () => 'UN DES COPROPRIETAIRES')
    .with('S', () => 'SUCCESSION DE')
    .with('V', () => 'LA VEUVE OU LES HERITIERS DE')
    .with('I', () => 'INDIVISION SIMPLE')
    .with('L', () => 'PROPRIETE EN LITIGE')
    .with(null, () => null)
    .exhaustive();
  const dnatpr =
    faker.helpers.maybe(() =>
      faker.helpers.arrayElement([
        'ECF',
        'FNL',
        'DOM',
        'HLM',
        'SEM',
        'TGV',
        'RFF',
        'CLL',
        'CAA'
      ] as const)
    ) ?? null;
  const dnatprtxt = match(dnatpr)
    .with('ECF', () => 'PERSONNE PHYSIQUE - ECONOMIQUEMENT FAIBLE (NON SERVI)')
    .with('FNL', () => 'PERSONNE PHYSIQUE - FONCTIONNAIRE LOGE')
    .with('DOM', () => 'PERSONNE PHYSIQUE - PROPRIETAIRE OCCUPANT DOM')
    .with('HLM', () => 'PERSONNE MORALE - OFFICE HLM')
    .with('SEM', () => 'PERSONNE MORALE - SOCIETE D ECONOMIE MIXTE')
    .with('TGV', () => 'PERSONNE MORALE - SNCF')
    .with('RFF', () => 'PERSONNE MORALE - RESEAU FERRE DE FRANCE')
    .with('CLL', () => 'PERSONNE MORALE - COLLECTIVITE LOCALE')
    .with('CAA', () => 'PERSONNE MORALE - CAISSE ASSURANCE AGRICOLE')
    .with(null, () => null)
    .exhaustive();
  const ccogrm =
    faker.helpers.maybe(() => faker.helpers.fromRegExp(/[0-9]A?/)) ?? null;
  const ccogrmtxt = match(ccogrm)
    .with('0', '0A', () => 'PERSONNES MORALES NON REMARQUABLES')
    .with('1', '1A', () => 'ETAT')
    .with('2', '2A', () => 'REGION')
    .with('3', '3A', () => 'DEPARTEMENT')
    .with('4', '4A', () => 'COMMUNE')
    .with('5', '5A', () => 'OFFICE HML')
    .with('6', '6A', () => 'PERSONNES MORALES REPRESENTANT DES SOCIETES')
    .with('7', '7A', () => 'COPROPRIETAIRE')
    .with('8', '8A', () => 'ASSOCIE')
    .with('9', '9A', () => 'ETABLISSEMENTS PUBLICS OU ORGANISMES ASSIMILES')
    .otherwise(() => 'PERSONNES PHYSIQUES');
  const firstName = faker.person.firstName();
  const middleNames = faker.helpers.multiple(() => faker.person.middleName(), {
    count: { min: 0, max: 2 }
  });
  const firstNames = middleNames.concat(faker.person.firstName());
  const lastName = faker.person.lastName();
  const ddenom = `${lastName}/${firstNames.join(' ')}`.toUpperCase();
  const gtyp3 = faker.string.fromCharacters('29');
  const gtyp4 = faker.string.numeric({ length: 1, exclude: ['0'] });
  const gtyp5 = faker.string.fromCharacters('123489');
  const gtyp6 = faker.string.fromCharacters('2345679');
  const dlign3 = gtyp3 === '9' ? null : faker.location.secondaryAddress();
  const dnvoiri = faker.string.numeric(4);
  const dlign4 = `${dnvoiri} ${faker.location.street()}`;
  const dlign5 = null;
  const dlign6 = `${idcom} ${idcomtxt}`;
  const locprop = faker.string.fromCharacters('1234569');
  const locproptxt = match(locprop)
    .with('1', () => 'MEME COMMUNE')
    .with('2', () => 'MEME DEPARTEMENT')
    .with('3', () => 'MEME REGION')
    .with('4', () => 'FRANCE METROPOLITAINE')
    .with('5', () => 'OUTRE MER')
    .with('6', () => 'ETRANGER')
    .with('9', () => 'INCONNU')
    .otherwise(() => null);
  const catpro2 = faker.string.alphanumeric(2);
  const catpro2txt = faker.string.alphanumeric(21);
  const catpro3 = faker.string.alphanumeric(3);
  const catpro3txt = faker.string.alphanumeric(105);

  return {
    idprodroit,
    idprocpte,
    idpersonne,
    idvoie,
    idcom,
    idcomtxt,
    ccodep,
    ccodir: faker.string.numeric({ length: 1, exclude: ['9'] }),
    ccocom,
    dnupro,
    dnulp,
    ccocif: faker.string.numeric({ length: 4, allowLeadingZeros: false }),
    dnuper,
    ccodro,
    // TODO: make it plausible
    ccodrotxt: 'TODO',
    typedroit,
    ccodem,
    ccodemtxt,
    gdesip:
      faker.helpers.maybe(() => faker.string.fromCharacters('01')) ?? null,
    gtoper:
      faker.helpers.maybe(() => faker.string.fromCharacters('12')) ?? null,
    ccoqua:
      faker.helpers.maybe(() => faker.string.fromCharacters('012')) ?? null,
    dnatpr,
    dnatprtxt,
    ccogrm,
    ccogrmtxt,
    dsglpm: null,
    // The list is too long to make it plausible
    dforme: faker.string.alphanumeric({ length: 4, casing: 'upper' }),
    ddenom,
    gtyp3,
    gtyp4,
    gtyp5,
    gtyp6,
    dlign3,
    dlign4,
    dlign5,
    dlign6,
    // TODO: make it plausible
    ccopay: null,
    ccodep1a2: ccodep,
    ccodira: faker.string.numeric(1),
    ccocomadr: ccocom,
    ccovoi: faker.string.numeric({ length: 5, allowLeadingZeros: true }),
    ccoriv,
    dnvoiri,
    dindic:
      faker.helpers.maybe(() => faker.string.fromCharacters('ABCD'), {
        probability: 0.9
      }) ?? null,
    ccopos: idcom,
    dqualp: faker.helpers.arrayElement(['M', 'MME']),
    dnomlp: firstName,
    dprnlp: middleNames.join(' '),
    jdatnss: faker.date
      .birthdate()
      .toISOString()
      .substring(0, 'yyyy-mm-dd'.length)
      .split('-')
      .toReversed()
      .join('/'),
    dldnss: `${faker.location.zipCode()} ${faker.location.city()}`,
    dsiren: faker.string.numeric(9),
    topja: faker.helpers.maybe(() => 'J', { probability: 0.05 }) ?? null,
    datja: null,
    dformjur: faker.string.alpha({
      length: { min: 2, max: 4 },
      casing: 'upper'
    }),
    dnomus:
      faker.helpers.maybe(() => faker.person.lastName().toUpperCase(), {
        probability: 0.1
      }) ?? lastName,
    dprnus: middleNames.concat(firstName).join(' '),
    locprop,
    locproptxt,
    catpro2,
    catpro2txt,
    catpro3,
    catpro3txt,
    idpk: faker.number.int({ min: 1, max: 1_000_000 })
  };
}

export function genDatafoncierOwners(
  idprocpte: string,
  count: number
): DatafoncierOwner[] {
  const ranks = faker.helpers.arrayElements(ACTIVE_OWNER_RANKS, count);
  return ranks.map((rank) =>
    genDatafoncierOwner(genIdprodroit(idprocpte, rank))
  );
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

export const FRANCE_BBOX: BBox = [-1.69, 43.19, 6.8, 49.49];

export function genHousingDTO(geoCode = genGeoCode()): HousingDTO {
  const department = geoCode.substring(0, 2);
  const locality = geoCode.substring(2, 5);
  const invariant = genInvariant(locality);
  const dataFileYears = faker.helpers
    .arrayElements(DATA_FILE_YEAR_VALUES)
    .toSorted();
  const dataYears: Array<number> = dataFileYears
    .map((dataFileYear) =>
      match(dataFileYear)
        .returnType<string>()
        .with(Pattern.string.startsWith('ff-'), (dataFileYear) =>
          dataFileYear.substring('ff-'.length, 'ff-YYYY'.length)
        )
        .with(Pattern.string.startsWith('lovac-'), (dataFileYear) =>
          dataFileYear.substring('lovac-'.length, 'lovac-YYYY'.length)
        )
        .exhaustive()
    )
    .map((year) => Number(year));

  return {
    id: faker.string.uuid(),
    geoCode,
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
    owner: null,
    livingArea: faker.number.int({ min: 10, max: 300 }),
    cadastralClassification: faker.helpers.arrayElement([
      null,
      ...CADASTRAL_CLASSIFICATION_VALUES
    ]),
    uncomfortable: faker.datatype.boolean(),
    vacancyStartYear: faker.date.past({ years: 20 }).getUTCFullYear(),
    housingKind: faker.helpers.arrayElement(HOUSING_KIND_VALUES),
    roomsCount: faker.number.int({ min: 0, max: 10 }),
    cadastralReference: faker.string.alpha(),
    buildingYear: faker.date.past({ years: 100 }).getUTCFullYear(),
    taxed: faker.datatype.boolean(),
    dataYears,
    dataFileYears,
    buildingLocation: faker.string.alpha(),
    ownershipKind:
      faker.helpers.maybe(() =>
        faker.helpers.arrayElement([
          ...INTERNAL_MONO_CONDOMINIUM_VALUES,
          ...INTERNAL_CO_CONDOMINIUM_VALUES
        ])
      ) ?? null,
    status: faker.helpers.weightedArrayElement([
      {
        value: HousingStatus.NEVER_CONTACTED,
        weight: HOUSING_STATUS_VALUES.length - 1
      },
      ...HOUSING_STATUS_VALUES.filter(
        (status) => status !== HousingStatus.NEVER_CONTACTED
      ).map((status) => ({
        value: status,
        weight: 1
      }))
    ]),
    subStatus: null,
    actualEnergyConsumption: faker.helpers.arrayElement([
      null,
      ...ENERGY_CONSUMPTION_VALUES
    ]),
    energyConsumption: faker.helpers.arrayElement([
      null,
      ...ENERGY_CONSUMPTION_VALUES
    ]),
    energyConsumptionAt: faker.helpers.maybe(() => faker.date.past()) ?? null,
    occupancy: faker.helpers.arrayElement(READ_WRITE_OCCUPANCY_VALUES),
    occupancyIntended: faker.helpers.arrayElement(READ_WRITE_OCCUPANCY_VALUES),
    campaignIds: [],
    source: faker.helpers.arrayElement(HOUSING_SOURCE_VALUES),
    plotId:
      geoCode +
      faker.string.numeric({ length: 3, allowLeadingZeros: true }) +
      faker.string.alpha({ length: 2, casing: 'upper' }) +
      faker.string.numeric({ length: 4, allowLeadingZeros: true }),
    plotArea: faker.number.int({ min: 100, max: 10000 }),
    beneficiaryCount: null,
    rentalValue: faker.number.int({ min: 500, max: 1000 }),
    lastMutationType: faker.helpers.arrayElement(MUTATION_TYPE_VALUES),
    lastMutationDate:
      faker.helpers.maybe(() => faker.date.past({ years: 20 }).toJSON()) ??
      null,
    lastTransactionDate:
      faker.helpers.maybe(() => faker.date.past({ years: 20 }).toJSON()) ??
      null,
    lastTransactionValue:
      faker.helpers.maybe(() => Number(faker.finance.amount({ dec: 0 }))) ??
      null
  };
}

export function genHousingOwnerDTO(owner: OwnerDTO): HousingOwnerDTO {
  const relativeLocation = faker.helpers.arrayElement(RELATIVE_LOCATION_VALUES);
  const absoluteDistance = match(relativeLocation)
    .returnType<number | null>()
    .with('same-address', () => faker.number.int({ min: 0, max: 49 }))
    .with('same-commune', () => faker.number.int({ min: 50, max: 100 }))
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
    suspendedAt: null,
    suspendedCause: null,
    updatedAt: faker.date.recent().toJSON(),
    establishmentId: establishment?.id ?? null,
    role,
    kind: null
  };
}

export function genDocumentDTO(
  creator: UserDTO,
  establishment: Pick<EstablishmentDTO, 'id'>
): DocumentDTO {
  return {
    id: faker.string.uuid(),
    filename: faker.system.fileName(),
    url: faker.internet.url(),
    contentType: faker.helpers.arrayElement([
      'application/pdf',
      'image/jpeg',
      'image/png',
      'application/msword'
    ]),
    sizeBytes: faker.number.int({ min: 1000, max: 5000000 }),
    createdAt: faker.date.recent().toJSON(),
    updatedAt: null,
    establishmentId: establishment.id,
    creator
  };
}
