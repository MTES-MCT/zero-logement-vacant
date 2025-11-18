import type { DatafoncierOwner } from '@zerologementvacant/models';
import { Array } from 'effect';
import { Knex } from 'knex';

import db, { where } from '~/infra/database';

export const datafoncierOwnersTable = 'df_owners_nat_2024';
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
        whereBuilder.whereNull('ccogrm').orWhereIn('ccogrm', ['0', '7', '8'])
      )
      .select('idpersonne'); // Sélectionnez uniquement 'idpersonne' pour le décompte distinct

    const result = await DatafoncierOwners()
      .from(subquery.as('sub'))
      .count({ total: '*' });

    return Number(result[0] ? result[0].total : 0);
  }

  async findDatafoncierOwners(opts?: FindOptions): Promise<DatafoncierOwner[]> {
    const whereOptions = where<DatafoncierOwnerFilters>(['idprocpte']);

    const owners: DatafoncierOwner[] = await DatafoncierOwners()
      .where(whereOptions(opts?.filters ?? {}))
      .orderBy(`${datafoncierOwnersTable}.dnulp`);
    return Array.dedupeWith(owners, (a, b) => a.idpersonne === b.idpersonne);
  }
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
