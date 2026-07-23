import { ReadableStream } from 'node:stream/web';

import {
  EstablishmentFiltersDTO,
  EstablishmentKind,
  EstablishmentSource
} from '@zerologementvacant/models';
import { Record } from 'effect';
import { snakeToCamel } from 'effect/String';
import type { Insertable, Selectable, Updateable } from 'kysely';
import { sql } from 'kysely';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { createLogger } from '~/infra/logger';
import { EstablishmentApi } from '~/models/EstablishmentApi';

import { fromUserDBO, UserDBO } from './userRepository';

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

  const rows = await listQuery(opts).orderBy('establishments.name').execute();

  return rows.map(parseEstablishmentRow);
}

interface GetOptions {
  includes?: EstablishmentInclude[];
}

async function get(
  id: string,
  options?: GetOptions
): Promise<EstablishmentApi | null> {
  logger.debug('Get establishment', { id });

  const row = await listQuery({
    filters: { id: [id] },
    includes: options?.includes
  }).executeTakeFirst();

  return row ? parseEstablishmentRow(row) : null;
}

interface FindOneOptions {
  siren?: number;
  includes?: EstablishmentInclude[];
}

async function findOne(
  options: FindOneOptions
): Promise<EstablishmentApi | null> {
  logger.info('Find establishment by', options);

  const row = await listQuery({
    filters: { siren: options.siren ? [options.siren.toString()] : undefined },
    includes: options.includes
  }).executeTakeFirst();

  return row ? parseEstablishmentRow(row) : null;
}

async function update(establishmentApi: EstablishmentApi): Promise<void> {
  const dbo = formatEstablishmentApi(establishmentApi);
  const row = Record.mapKeys(
    dbo as unknown as Record<string, unknown>,
    snakeToCamel
  ) as Updateable<DB['establishments']>;
  await kysely
    .updateTable('establishments')
    .set(row)
    .where('id', '=', establishmentApi.id)
    .execute();
}

async function setAvailable(establishment: EstablishmentApi): Promise<void> {
  await kysely
    .updateTable('establishments')
    .set({ available: true })
    .where('id', '=', establishment.id)
    .execute();
}

interface StreamOptions {
  updatedAfter?: Date;
  includes?: EstablishmentInclude[];
}

function stream(options?: StreamOptions): ReadableStream<EstablishmentApi> {
  const query = listQuery({ includes: options?.includes })
    .orderBy('establishments.name')
    .$if(!!options?.updatedAfter, (query) =>
      query.where(
        'establishments.updatedAt',
        '>',
        options?.updatedAfter ?? new Date(0)
      )
    );

  async function* rows() {
    for await (const row of query.stream()) {
      yield parseEstablishmentRow(row);
    }
  }

  return ReadableStream.from(rows());
}

async function save(establishment: EstablishmentDBO): Promise<void> {
  logger.debug('Saving establishment...', {
    establishment
  });

  const row = Record.mapKeys(
    establishment as unknown as Record<string, unknown>,
    snakeToCamel
  ) as Insertable<DB['establishments']>;
  await kysely.insertInto('establishments').values(row).execute();
  logger.info('Saved establishment', { establishment: establishment.id });
}

interface ListOptions {
  filters?: EstablishmentFiltersDTO;
  includes?: EstablishmentInclude[];
}

function listQuery(opts?: ListOptions) {
  const filters = opts?.filters;
  const includes = opts?.includes ?? [];

  return kysely
    .selectFrom('establishments')
    .selectAll('establishments')
    .$if(filters?.id !== undefined, (query) =>
      query.where('establishments.id', 'in', filters?.id ?? [])
    )
    .$if(filters?.available !== undefined, (query) =>
      query.where('establishments.available', '=', filters?.available ?? false)
    )
    .$if(!!filters?.active, (query) =>
      query.where((eb) =>
        eb.exists(
          eb
            .selectFrom('users')
            .select('users.id')
            .whereRef('users.establishmentId', '=', 'establishments.id')
            .where('users.deletedAt', 'is', null)
        )
      )
    )
    .$if(!!filters?.query?.length, (query) =>
      query.where(
        sql<boolean>`upper(unaccent(establishments.name)) like '%' || upper(unaccent(${filters?.query})) || '%'`
      )
    )
    .$if(!!filters?.related, (query) =>
      query
        .where('establishments.id', '!=', filters?.related ?? '')
        .where(
          sql<boolean>`establishments.localities_geo_code && (SELECT localities_geo_code FROM establishments WHERE id = ${filters?.related})`
        )
    )
    .$if(filters?.geoCodes !== undefined, (query) =>
      query.where(
        sql<boolean>`${sql.val(filters?.geoCodes ?? [])} && establishments.localities_geo_code`
      )
    )
    .$if(!!filters?.kind, (query) =>
      query.where('establishments.kind', 'in', filters?.kind ?? [])
    )
    .$if(!!filters?.name, (query) =>
      query.where(
        sql<boolean>`lower(unaccent(regexp_replace(regexp_replace(establishments.name, '''| [(].*[)]', '', 'g'), ' | - ', '-', 'g'))) like '%' || ${filters?.name}`
      )
    )
    .$if(!!filters?.siren, (query) =>
      query.where(
        'establishments.siren',
        'in',
        (filters?.siren ?? []).map(Number)
      )
    )
    .$if(includes.includes('users'), (query) =>
      query.select((eb) =>
        eb
          .selectFrom('users')
          .select(
            sql<UserDBO[]>`coalesce(json_agg(users.*), '[]'::json)`.as('users')
          )
          .whereRef('users.establishmentId', '=', 'establishments.id')
          .where('users.deletedAt', 'is', null)
          .as('users')
      )
    );
}

type EstablishmentInclude = 'users';

type EstablishmentRow = Selectable<DB['establishments']> & {
  users?: UserDBO[] | null;
};

function parseEstablishmentRow(row: EstablishmentRow): EstablishmentApi {
  return {
    id: row.id,
    name: row.name,
    shortName: row.name,
    siren: (row.siren as number).toString(),
    available: row.available,
    geoCodes: row.localitiesGeoCode as string[],
    kind: row.kind as EstablishmentKind,
    source: row.source as EstablishmentSource,
    users: row.users?.map(fromUserDBO)
  };
}

export interface EstablishmentDBO {
  id: string;
  name: string;
  siren: number;
  siret?: string | null;
  /**
   * @deprecated An establishment is considered available
   * if it has at least one active user.
   */
  available: boolean;
  localities_geo_code: string[];
  kind: EstablishmentKind;
  kind_admin_meta?: string | null;
  millesime?: string | null;
  layer_geo_label?: string | null;
  dep_code?: string[] | null;
  dep_name?: string | null;
  reg_code?: string[] | null;
  reg_name?: string | null;
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
  shortName: establishment.name,
  siren: establishment.siren.toString(),
  available: establishment.available,
  geoCodes: establishment.localities_geo_code,
  kind: establishment.kind,
  source: establishment.source,
  users: establishment.users?.map(fromUserDBO)
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
