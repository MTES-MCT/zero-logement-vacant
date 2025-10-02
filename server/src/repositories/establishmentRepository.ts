import highland from 'highland';
import { Knex } from 'knex';

import {
  EstablishmentFiltersDTO,
  EstablishmentKind,
  EstablishmentSource
} from '@zerologementvacant/models';
import db, { likeUnaccent, notDeleted } from '~/infra/database';
import { EstablishmentApi } from '~/models/EstablishmentApi';
import { createLogger } from '~/infra/logger';
import { usersTable, parseUserApi, UserDBO } from './userRepository';

export const establishmentsTable = 'establishments';
export const Establishments = (transaction = db) =>
  transaction<EstablishmentDBO>(establishmentsTable);

const logger = createLogger('establishmentRepository');

type FindOptions = {
  filters?: EstablishmentFiltersDTO;
  includes?: EstablishmentInclude[];
};

async function find(
  opts?: FindOptions
): Promise<ReadonlyArray<EstablishmentApi>> {
  logger.debug('Find establishments', opts);

  const establishments: EstablishmentDBO[] =
    await listQuery(opts).orderBy('name');

  return establishments.map(parseEstablishmentApi);
}

interface GetOptions {
  includes?: EstablishmentInclude[];
}

async function get(
  id: string,
  options?: GetOptions
): Promise<EstablishmentApi | null> {
  logger.debug('Get establishment', { id });

  const establishment = await listQuery({
    filters: { id: [id] },
    includes: options?.includes
  }).first();

  return establishment ? parseEstablishmentApi(establishment) : null;
}

interface FindOneOptions {
  siren?: number;
  includes?: EstablishmentInclude[];
}

async function findOne(
  options: FindOneOptions
): Promise<EstablishmentApi | null> {
  logger.info('Find establishment by', options);

  const result = await listQuery({
    filters: { siren: options.siren ? [options.siren.toString()] : undefined },
    includes: options.includes
  }).first();

  return result ? parseEstablishmentApi(result) : null;
}

async function update(establishmentApi: EstablishmentApi): Promise<void> {
  await Establishments()
    .where('id', establishmentApi.id)
    .update(formatEstablishmentApi(establishmentApi));
}

async function setAvailable(establishment: EstablishmentApi): Promise<void> {
  await Establishments()
    .where({ id: establishment.id })
    .update({ available: true });
}

interface StreamOptions {
  updatedAfter?: Date;
  includes?: EstablishmentInclude[];
}

async function stream(options?: StreamOptions) {
  const stream = listQuery({ includes: options?.includes })
    .orderBy('name')
    .modify((query) => {
      if (options?.updatedAfter) {
        query.andWhere('updated_at', '>', options.updatedAfter);
      }
    })
    .stream();
  return highland<EstablishmentDBO>(stream).map(parseEstablishmentApi);
}

async function save(establishment: EstablishmentDBO): Promise<void> {
  logger.debug('Saving establishment...', {
    establishment
  });

  await Establishments().insert(establishment);
  logger.info('Saved establishment', { establishment: establishment.id });
}

interface ListOptions {
  filters?: EstablishmentFiltersDTO;
  includes?: EstablishmentInclude[];
}

function listQuery(opts?: ListOptions) {
  return Establishments()
    .select(`${establishmentsTable}.*`)
    .modify(filter(opts?.filters))
    .modify(include(opts?.includes ?? []));
}

type EstablishmentInclude = 'users';

function include(includes: EstablishmentInclude[]) {
  const joins: Record<
    EstablishmentInclude,
    (query: Knex.QueryBuilder) => void
  > = {
    users: (query) =>
      query.select('u.users').joinRaw(
        `LEFT JOIN LATERAL (
          SELECT COALESCE(json_agg(${usersTable}.*), '[]'::json) AS users
          FROM ${usersTable}
          WHERE ${usersTable}.establishment_id = ${establishmentsTable}.id
            AND ${usersTable}.deleted_at IS NULL
        ) u ON true`
      )
  };

  return (query: Knex.QueryBuilder) => {
    includes.forEach((includeType) => {
      joins[includeType](query);
    });
  };
}

function filter(filters?: EstablishmentFiltersDTO) {
  return (builder: Knex.QueryBuilder<EstablishmentDBO>) => {
    if (filters?.id) {
      builder.whereIn('id', filters.id);
    }
    if (filters?.available !== undefined) {
      builder.where('available', filters.available);
    }
    if (filters?.active) {
      builder.whereExists((subquery) => {
        subquery
          .select('id')
          .from(usersTable)
          .where({
            establishment_id: db.ref(`${establishmentsTable}.id`)
          })
          .where(notDeleted);
      });
    }
    if (filters?.query?.length) {
      builder.whereRaw(likeUnaccent('name', filters.query));
    }
    if (filters?.geoCodes) {
      builder.whereRaw('? && localities_geo_code', [filters.geoCodes]);
    }
    if (filters?.kind) {
      builder.whereIn('kind', filters.kind);
    }
    if (filters?.name) {
      builder.whereRaw(
        `lower(unaccent(regexp_replace(regexp_replace(name, '''| [(].*[)]', '', 'g'), ' | - ', '-', 'g'))) like '%' || ?`,
        filters?.name
      );
    }
    if (filters?.siren) {
      builder.whereIn('siren', filters.siren);
    }
  };
}

export interface EstablishmentDBO {
  id: string;
  name: string;
  siren: number;
  available: boolean;
  localities_geo_code: string[];
  kind: EstablishmentKind;
  source: EstablishmentSource;
  updated_at: Date;
  users?: UserDBO[];
}

export const formatEstablishmentApi = (
  establishment: EstablishmentApi
): EstablishmentDBO => ({
  id: establishment.id,
  name: establishment.name,
  siren: Number(establishment.siren),
  available: establishment.available,
  localities_geo_code: establishment.geoCodes,
  kind: establishment.kind,
  updated_at: new Date(),
  source: establishment.source
});

export const parseEstablishmentApi = (
  establishment: EstablishmentDBO
): EstablishmentApi => ({
  id: establishment.id,
  name: establishment.name,
  shortName:
    establishment.kind === 'Commune'
      ? establishment.name.replaceAll(/^Commune d(e\s|')/g, '')
      : establishment.name,
  siren: establishment.siren.toString(),
  available: establishment.available,
  geoCodes: establishment.localities_geo_code,
  kind: establishment.kind,
  source: establishment.source,
  users: establishment.users?.map(parseUserApi)
});

export default {
  find,
  get,
  findOne,
  update,
  setAvailable,
  stream,
  formatEstablishmentApi,
  save
};
