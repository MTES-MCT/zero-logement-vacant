import highland from 'highland';
import lodash from 'lodash';
import { v4 as uuidv4 } from 'uuid';

import {
  getOwnershipKindFromValue,
  HousingApi,
  OccupancyKindApi,
} from '../../server/models/HousingApi';
import db from '../../server/repositories/db';
import { housingTable } from '../../server/repositories/housingRepository';
import { HousingOwnerApi } from '../../server/models/OwnerApi';
import { HousingStatusApi } from '../../server/models/HousingStatusApi';
import { ownerTable } from '../../server/repositories/ownerRepository';
import { Knex } from 'knex';

export const lovacTable = 'lovac';

async function findOne(options: FindOneOptions): Promise<HousingApi | null> {
  const housing = await db(lovacTable)
    .select(`${lovacTable}.*`)
    .where({
      local_id: options.localId,
    })
    .modify(createOwnerQuery())
    .modify(createCoownerQuery(2))
    .modify(createCoownerQuery(3))
    .modify(createCoownerQuery(4))
    .modify(createCoownerQuery(5))
    .modify(createCoownerQuery(6))
    .orderBy(`${lovacTable}.local_id`)
    .orderBy(`${lovacTable}.vacancy_start_year`, 'desc')
    .first();
  return housing ? parseLovacHousingApi(housing) : null;
}

interface FindOneOptions {
  localId: string;
}

function newHousing() {
  return db(lovacTable)
    .leftJoin(
      housingTable,
      `${lovacTable}.local_id`,
      `${housingTable}.local_id`
    )
    .whereNull(`${housingTable}.local_id`);
}

async function count(): Promise<number> {
  const value = await newHousing()
    .countDistinct(`${lovacTable}.local_id`)
    .first();
  return Number(value?.count);
}

function streamNewHousing(): Highland.Stream<HousingApi> {
  // Select all the housing that have the most recent vacancy_start_year
  const stream = newHousing()
    .select(`${lovacTable}.*`)
    .distinctOn(`${lovacTable}.local_id`)
    .orderBy(`${lovacTable}.local_id`)
    .orderBy(`${lovacTable}.vacancy_start_year`, 'desc')
    .modify(createOwnerQuery())
    .modify(createCoownerQuery(2))
    .modify(createCoownerQuery(3))
    .modify(createCoownerQuery(4))
    .modify(createCoownerQuery(5))
    .modify(createCoownerQuery(6))
    .stream();
  return highland<LovacHousingDBO>(stream).map(parseLovacHousingApi);
}

export type LovacOwner = {
  ownership_kind: string;
  full_name: string;
  administrator: string;
  owner_raw_address: string[];
  birth_date: Date;
  owner_kind: string;
  owner_kind_detail: string;
} & Record<`full_name${AdditionalOwnerIndex}`, string | undefined> &
  Record<`owner_raw_address${AdditionalOwnerIndex}`, string[]> &
  Record<`birth_date${AdditionalOwnerIndex}`, Date | undefined>;

function streamOwners(): Highland.Stream<LovacOwner> {
  const fields = [
    'ownership_kind',
    'full_name',
    'administrator',
    'owner_raw_address',
    'birth_date',
    'owner_kind',
    'owner_kind_detail',
    ...[2, 3, 4, 5, 6].flatMap((i) => [
      `full_name${i}`,
      `owner_raw_address${i}`,
      `birth_date${i}`,
    ]),
  ];
  const stream = db<LovacOwner>(lovacTable)
    .select(fields)
    .distinctOn(`${lovacTable}.local_id`)
    .orderBy(`${lovacTable}.local_id`)
    .orderBy(`${lovacTable}.vacancy_start_year`, 'desc')
    .stream();
  return highland<LovacOwner>(stream);
}

type LovacHousingDBO = {
  invariant: string;
  local_id: string;
  building_id: string;
  raw_address: string[];
  geo_code: string;
  latitude: number;
  longitude: number;
  cadastral_classification: number;
  uncomfortable: boolean;
  vacancy_start_year: number;
  housing_kind: string;
  rooms_count: number;
  living_area: number;
  cadastral_reference: string;
  building_year: number;
  mutation_date: string;
  taxed: boolean;
  data_year: string;
  beneficiary_count: number;
  building_location: string;
  rental_value: string;
  ownership_kind: string;
  owner_id?: string;
  full_name: string;
  administrator: string;
  owner_raw_address: string[];
  birth_date: Date;
  owner_kind: string;
  owner_kind_detail: string;
} & Record<`owner_id${AdditionalOwnerIndex}`, string | undefined> &
  Record<`full_name${AdditionalOwnerIndex}`, string | undefined> &
  Record<`owner_raw_address${AdditionalOwnerIndex}`, string[]> &
  Record<`birth_date${AdditionalOwnerIndex}`, Date | undefined>;

export type AdditionalOwnerIndex = 2 | 3 | 4 | 5 | 6;

function createOwnerQuery() {
  return (query: Knex.QueryBuilder) =>
    query
      .joinRaw(
        `
      LEFT JOIN ${ownerTable} o
      ON o.full_name = ${lovacTable}.full_name
      AND o.raw_address = ${lovacTable}.owner_raw_address
      AND (
        o.birth_date = ${lovacTable}.birth_date
        OR ${lovacTable}.birth_date IS NULL
      ) 
    `
      )
      .select({
        owner_id: 'o.id',
      });
}

function createCoownerQuery(i: AdditionalOwnerIndex) {
  return (query: Knex.QueryBuilder) =>
    query
      .joinRaw(
        `
      LEFT JOIN ${ownerTable} o${i}
      ON o${i}.full_name = ${lovacTable}.full_name${i}
      AND o${i}.raw_address = ${lovacTable}.owner_raw_address${i}
      AND (
        o${i}.birth_date = ${lovacTable}.birth_date${i}
        OR ${lovacTable}.birth_date${i} IS NULL
      )
    `
      )
      .select({
        [`owner_id${i}`]: `o${i}.id`,
      });
}

function parseLovacHousingApi(housing: LovacHousingDBO): HousingApi {
  // Should be erased later in the chain by the original housing id
  // if it exists
  const housingId = uuidv4();

  function parseCoowner(i: AdditionalOwnerIndex): HousingOwnerApi | null {
    const id: string = housing[`owner_id${i}`] ?? uuidv4();
    const fullName: string | undefined = housing[`full_name${i}`];
    const birthDate: Date | undefined = housing[`birth_date${i}`];
    const rawAddress: string[] | undefined = housing[`owner_raw_address${i}`];
    if (!fullName || !rawAddress) {
      return null;
    }

    return {
      id,
      fullName,
      birthDate,
      rawAddress,
      housingId,
      origin: 'Lovac',
      rank: i,
    };
  }

  const coowners = [
    parseCoowner(2),
    parseCoowner(3),
    parseCoowner(4),
    parseCoowner(5),
    parseCoowner(6),
  ];

  return {
    id: housingId,
    buildingLocation: housing.building_location,
    cadastralClassification: housing.cadastral_classification,
    cadastralReference: housing.cadastral_reference,
    campaignIds: [],
    contactCount: 0,
    dataYears: [Number(lodash.trim(housing.data_year))],
    geoCode: housing.geo_code,
    housingKind: housing.housing_kind,
    livingArea: housing.living_area,
    localId: housing.local_id,
    localityKind: '',
    occupancy: OccupancyKindApi.Vacant,
    owner: {
      id: housing.owner_id ?? uuidv4(),
      fullName: housing.full_name,
      rawAddress: housing.owner_raw_address,
      birthDate: housing.birth_date,
      administrator: housing.administrator,
    },
    coowners: coowners.filter(
      (value): value is HousingOwnerApi => value !== null
    ),
    invariant: housing.invariant,
    rawAddress: housing.raw_address,
    roomsCount: housing.rooms_count,
    status: HousingStatusApi.NeverContacted,
    subStatus: '',
    taxed: housing.taxed,
    uncomfortable: housing.uncomfortable,
    vacancyReasons: [],
    vacancyStartYear: housing.vacancy_start_year,
    longitude: housing.longitude,
    latitude: housing.latitude,
    buildingYear: housing.building_year,
    ownershipKind: getOwnershipKindFromValue(housing.ownership_kind),
  };
}

const lovacRepository = {
  count,
  findOne,
  streamNewHousing,
  streamOwners,
};

export default lovacRepository;
