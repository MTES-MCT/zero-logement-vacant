import highland from 'highland';

import { OwnerStreamRepository, StreamOptions } from './ownerStreamRepository';
import db from '../../server/repositories/db';
import {
  DatafoncierOwner,
  ownerDatafoncierSchema,
  toOwnerApi,
} from '../shared/models/DatafoncierOwner';
import { OwnerApi } from '../../server/models/OwnerApi';
import validator from '../shared/validator';
import { Knex } from 'knex';

const FIELDS = [
  'idprodroit',
  'dlign3',
  'dlign4',
  'dlign5',
  'dlign6',
  'ddenom',
  'jdatnss',
  'catpro2txt',
  'catpro3txt',
];

export const datafoncierOwnersTable = 'zlv_proprio_epci2';

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

class OwnerPostgresRepository implements OwnerStreamRepository {
  stream(opts?: StreamOptions): Highland.Stream<OwnerApi> {
    const query = db<DatafoncierOwner>(datafoncierOwnersTable)
      .select(FIELDS)
      .where((whereBuilder) =>
        whereBuilder.whereNull('ccogrm').orWhereIn('ccogrm', ['0', '7', '8'])
      )
      // Avoid importing owners that have no address at all
      .modify(hasAddress())
      .modify(hasName())
      .stream();

    return highland<DatafoncierOwner>(query)
      .map(validator.validate(ownerDatafoncierSchema))
      .map(toOwnerApi);
  }
}

function createOwnerPostgresRepository(): OwnerStreamRepository {
  return new OwnerPostgresRepository();
}

export default createOwnerPostgresRepository;
