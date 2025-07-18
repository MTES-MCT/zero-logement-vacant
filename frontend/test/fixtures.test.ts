import { faker } from '@faker-js/faker';
import {
  AddressKinds,
  CADASTRAL_CLASSIFICATION_VALUES,
  DatafoncierHousing,
  ENERGY_CONSUMPTION_VALUES,
  EventType,
  HOUSING_KIND_VALUES,
  HousingStatus,
  MUTATION_TYPE_VALUES,
  Occupancy,
  USER_ROLE_VALUES,
  UserRole
} from '@zerologementvacant/models';
import {
  genAddressDTO,
  genEventDTO,
  genNoteDTO,
  genOwnerDTO,
  genUserDTO
} from '@zerologementvacant/models/fixtures';
import { addHours } from 'date-fns';

import fp from 'lodash/fp';
import randomstring from 'randomstring';
import { Address } from '../src/models/Address';
import { Event, fromEventDTO } from '../src/models/Event';
import { Group } from '../src/models/Group';
import { Housing } from '../src/models/Housing';
import { LocalityKinds } from '../src/models/Locality';
import { fromNoteDTO, Note } from '../src/models/Note';
import { fromOwnerDTO, Owner } from '../src/models/Owner';
import { Prospect } from '../src/models/Prospect';
import { SignupLink } from '../src/models/SignupLink';
import { AuthUser, fromUserDTO, toUserDTO, User } from '../src/models/User';

export const genBoolean = () => Math.random() < 0.5;

export const genSiren = () => genNumber(9);

export function genEmail() {
  const name = randomstring.generate({
    length: 4,
    charset: 'alphabetic',
    readable: true
  });
  const domain = randomstring.generate({
    length: 4,
    charset: 'alphabetic',
    readable: true
  });
  return `${name}@${domain}.com`;
}

export function genNumber(length = 10): number {
  return Number(
    randomstring.generate({
      length,
      charset: 'numeric'
    })
  );
}

export function genAuthUser(user: User): AuthUser {
  return {
    accessToken: randomstring.generate(),
    user,
    establishment: {
      id: faker.string.uuid(),
      name: randomstring.generate(),
      siren: genNumber(10),
      kind: 'Commune',
      available: genBoolean(),
      shortName: randomstring.generate(),
      geoCodes: [faker.location.zipCode()],
      source: 'manual'
    },
    jimoData: {}
  };
}

export function genUser(
  role: UserRole = faker.helpers.arrayElement(USER_ROLE_VALUES)
): User {
  return fromUserDTO(genUserDTO(role));
}

export function genOwner(): Owner {
  return fromOwnerDTO(genOwnerDTO());
}

export function genHousing(): Housing {
  return {
    id: randomstring.generate(),
    localId: randomstring.generate(),
    geoCode: genNumber(5).toString(),
    invariant: randomstring.generate(),
    rawAddress: [randomstring.generate(), randomstring.generate()],
    localityKind: LocalityKinds.ACV,
    owner: genOwner(),
    livingArea: genNumber(4),
    housingKind: faker.helpers.arrayElement(HOUSING_KIND_VALUES),
    roomsCount: genNumber(1),
    buildingId: faker.string.uuid(),
    buildingYear: genNumber(4),
    vacancyStartYear: genNumber(4),
    dataFileYears: ['lovac-2021'],
    campaignIds: [],
    cadastralReference: '',
    uncomfortable: false,
    cadastralClassification: faker.helpers.arrayElement(
      CADASTRAL_CLASSIFICATION_VALUES
    ),
    taxed: false,
    ownershipKind: 'single',
    buildingVacancyRate: genNumber(2),
    status: HousingStatus.NEVER_CONTACTED,
    source: null,
    occupancy: Occupancy.VACANT,
    occupancyIntended: Occupancy.VACANT,
    energyConsumption: faker.helpers.arrayElement(ENERGY_CONSUMPTION_VALUES),
    energyConsumptionAt: new Date(),
    lastMutationType: faker.helpers.arrayElement(MUTATION_TYPE_VALUES),
    lastMutationDate: faker.date.past({ years: 20 }).toJSON(),
    lastTransactionDate:
      faker.helpers.maybe(() => faker.date.past({ years: 20 }).toJSON()) ??
      null,
    lastTransactionValue:
      faker.helpers.maybe(() =>
        Number(
          faker.finance.amount({
            min: 100_000,
            max: 1_000_000,
            dec: 0
          })
        )
      ) ?? null
  };
}

export const genAddress = (): Address =>
  fp.omit(['refId', 'addressKind'], genAddressDTO('', AddressKinds.Housing));

export function genSignupLink(email: string): SignupLink {
  return {
    id: randomstring.generate({
      length: 100,
      charset: 'alphanumeric'
    }),
    prospectEmail: email,
    expiresAt: addHours(new Date(), 24 * 7)
  };
}

export function genProspect(): Prospect {
  return {
    email: genEmail(),
    establishment: {
      id: randomstring.generate(),
      siren: genSiren()
    },
    hasAccount: genBoolean(),
    hasCommitment: genBoolean()
  };
}

export function genGroup(): Group {
  const ownerCount = faker.number.int({ min: 1, max: 10 });
  const housingCount = ownerCount + faker.number.int({ min: 1, max: 10 });
  return {
    id: randomstring.generate(),
    title: randomstring.generate(),
    description: randomstring.generate(),
    housingCount,
    ownerCount,
    createdAt: new Date(),
    createdBy: genUser(),
    archivedAt: null
  };
}

export function genDatafoncierHousing(): DatafoncierHousing {
  return {
    idlocal: randomstring.generate(12),
    idbat: randomstring.generate(16),
    idpar: randomstring.generate(14),
    idtup: randomstring.generate(),
    idsec: randomstring.generate(10),
    idvoie: randomstring.generate(9),
    idprocpte: randomstring.generate(11),
    idcom: randomstring.generate({
      length: 5,
      charset: 'numeric'
    }),
    idcomtxt: randomstring.generate(45),
    ccodep: randomstring.generate(2),
    ccodir: randomstring.generate(1),
    ccocom: randomstring.generate(3),
    invar: randomstring.generate(10),
    ccopre: randomstring.generate(3),
    ccosec: randomstring.generate(2),
    dnupla: randomstring.generate(4),
    dnubat: randomstring.generate(2),
    descc: randomstring.generate(2),
    dniv: randomstring.generate(2),
    dpor: randomstring.generate(5),
    ccoriv: randomstring.generate(4),
    ccovoi: randomstring.generate(5),
    dnvoiri: randomstring.generate(4),
    dindic: randomstring.generate(1),
    ccocif: randomstring.generate(4),
    dvoilib: randomstring.generate(30),
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
    dteloc: randomstring.generate(1),
    dteloctxt: 'APPARTEMENT',
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
    ccthp: 'V',
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
    ban_score: Math.random().toString(),
    ban_geom: randomstring.generate(),
    ban_cp: randomstring.generate(5),
    geomloc: randomstring.generate(),
    dis_ban_ff: genNumber(1),
    lib_epci: randomstring.generate(),
    code_epci: randomstring.generate(),
    idpk: null
  };
}

type EventOptions<Type extends EventType> = Pick<
  Event<Type>,
  'type' | 'creator' | 'nextOld' | 'nextNew'
>;
export function genEvent<Type extends EventType>(
  options: EventOptions<Type>
): Event<Type> {
  const { type, creator, nextOld, nextNew } = options;
  return fromEventDTO(
    genEventDTO<Type>({
      type: type,
      creator: toUserDTO(creator),
      nextOld: nextOld,
      nextNew: nextNew
    })
  );
}

export function genNote(creator: User): Note {
  return fromNoteDTO(genNoteDTO(toUserDTO(creator)));
}
