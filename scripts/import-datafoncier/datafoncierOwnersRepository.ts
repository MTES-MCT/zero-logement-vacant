import highland from 'highland';
import db from '../../server/repositories/db';
import {
  DatafoncierHousing,
  DatafoncierOwner,
  ownerDatafoncierSchema,
  validator,
} from '../shared';
import { Knex } from 'knex';
import { ownerMatchTable } from '../../server/repositories/ownerMatchRepository';
import {
  OwnerDBO,
  ownerTable,
  parseOwnerApi,
} from '../../server/repositories/ownerRepository';
import { OwnerApi } from '../../server/models/OwnerApi';
import fp from 'lodash/fp';

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

export const datafoncierOwnersTable = 'df_owners_nat';
export const DatafoncierOwners = () =>
  db<DatafoncierOwner>(datafoncierOwnersTable);

class DatafoncierOwnersRepository {
  async findOwners(housing: DatafoncierHousing): Promise<OwnerApi[]> {
    const owners: Array<OwnerDBO> = await DatafoncierOwners()
      .where({
        idprocpte: housing.idprocpte,
      })
      .join(
        ownerMatchTable,
        `${ownerMatchTable}.idpersonne`,
        `${datafoncierOwnersTable}.idpersonne`
      )
      .join(ownerTable, `${ownerTable}.id`, `${ownerMatchTable}.owner_id`)
      .orderBy(`${datafoncierOwnersTable}.dnulp`);
    return fp.pipe(fp.uniqBy('idpersonne'), fp.map(parseOwnerApi))(owners);
  }

  stream(): Highland.Stream<DatafoncierOwner> {
    const query = DatafoncierOwners()
      .select(FIELDS)
      .where((whereBuilder) =>
        whereBuilder.whereNull('ccogrm').orWhereIn('ccogrm', ['0', '7', '8'])
      )
      // Avoid importing owners that have no address at all
      .modify(hasAddress())
      .modify(hasName())
      .stream();

    return highland<DatafoncierOwner>(query).map(
      validator.validate(ownerDatafoncierSchema)
    );
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
