import highland from 'highland';
import db, { where } from '~/infra/database';
import {
  DatafoncierOwner,
  DatafoncierOwnerSortApi,
  ownerDatafoncierSchema,
  validator,
} from '~/scripts/shared';
import { Knex } from 'knex';
import { ownerMatchTable } from './ownerMatchRepository';
import { OwnerDBO, ownerTable, parseOwnerApi } from './ownerRepository';
import { OwnerApi } from '~/models/OwnerApi';
import fp from 'lodash/fp';
import { sortQuery } from '~/models/SortApi';
import { getYear } from 'date-fns';

const FIELDS = [
  'idprodroit',
  'idpersonne',
  'dlign3',
  'dlign4',
  'dlign5',
  'dlign6',
  'ddenom',
  'jdatnss',
  'catpro2txt',
  'catpro3txt',
];

export const datafoncierOwnersTable = `df_owners_nat_${getYear(new Date()) - 1}`;
export const DatafoncierOwners = (transaction = db) =>
  transaction<DatafoncierOwner>(datafoncierOwnersTable);

interface DatafoncierOwnerFilters {
  idprocpte?: string;
}

interface FindOptions {
  filters?: DatafoncierOwnerFilters;
}

class DatafoncierOwnersRepository {
  async count(): Promise<number> {
    const subquery = DatafoncierOwners()
      .distinctOn('idpersonne')
      .where((whereBuilder) =>
        whereBuilder.whereNull('ccogrm').orWhereIn('ccogrm', ['0', '7', '8']),
      )
      .select('idpersonne'); // Sélectionnez uniquement 'idpersonne' pour le décompte distinct

    const result = await DatafoncierOwners()
      .from(subquery.as('sub'))
      .count({ total: '*' });

    return Number(result[0] ? result[0].total : 0);
  }

  async find(opts?: FindOptions): Promise<OwnerApi[]> {
    const whereOptions = where<DatafoncierOwnerFilters>(['idprocpte']);

    const owners: OwnerDBO[] = await DatafoncierOwners()
      .where(whereOptions(opts?.filters))
      .join(
        ownerMatchTable,
        `${ownerMatchTable}.idpersonne`,
        `${datafoncierOwnersTable}.idpersonne`,
      )
      .join(ownerTable, `${ownerTable}.id`, `${ownerMatchTable}.owner_id`)
      .orderBy(`${datafoncierOwnersTable}.dnulp`);
    return fp.pipe(fp.uniqBy('idpersonne'), fp.map(parseOwnerApi))(owners);
  }

  async findDatafoncierOwners(opts?: FindOptions): Promise<DatafoncierOwner[]> {
    const whereOptions = where<DatafoncierOwnerFilters>(['idprocpte']);

    const owners: DatafoncierOwner[] = await DatafoncierOwners()
      .where(whereOptions(opts?.filters))
      .orderBy(`${datafoncierOwnersTable}.dnulp`);
    return fp.pipe(fp.uniqBy('idpersonne'))(owners);
  }

  stream(opts?: StreamOptions): Highland.Stream<DatafoncierOwner> {
    const query = DatafoncierOwners()
      .select(FIELDS)
      .distinctOn('idpersonne')
      .where((whereBuilder) =>
        whereBuilder.whereNull('ccogrm').orWhereIn('ccogrm', ['0', '7', '8']),
      )
      // Avoid importing owners that have no address at all
      .modify(hasAddress())
      .modify(hasName())
      .modify(
        sortQuery(opts?.sort, {
          keys: {
            idprocpte: (query) =>
              query.orderBy('idprocpte', opts?.sort?.idprocpte),
          },
          default: (query) => query.orderBy('idpersonne'),
        }),
      )
      .stream();

    return highland<DatafoncierOwner>(query).map(
      validator.validate(ownerDatafoncierSchema),
    );
  }
}

interface StreamOptions {
  sort?: DatafoncierOwnerSortApi;
}

export function hasAddress() {
  return (query: Knex.QueryBuilder<DatafoncierOwner>) => {
    query
      .whereNotNull('dlign3')
      .orWhereNotNull('dlign4')
      .orWhereNotNull('dlign5')
      .orWhereNotNull('dlign6');
  };
}

export function hasName() {
  return (query: Knex.QueryBuilder<DatafoncierOwner>) => {
    query.whereNotNull('ddenom');
  };
}

function createDatafoncierOwnersRepository() {
  return new DatafoncierOwnersRepository();
}

export default createDatafoncierOwnersRepository;
