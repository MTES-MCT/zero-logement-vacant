import type { Insertable } from 'kysely';
import { Knex } from 'knex';

import db from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { createLogger } from '~/infra/logger';
import { HousingApi } from '~/models/HousingApi';
import { PrecisionApi } from '~/models/PrecisionApi';

// DBO types — exported for use in tests, seeds, and controllers.
export type PrecisionDBO = PrecisionApi;
export type HousingPrecisionDBO = {
  housing_geo_code: string;
  housing_id: string;
  precision_id: string;
  created_at: Date | string;
};

export const PRECISION_TABLE = 'precisions' as const;
export const HOUSING_PRECISION_TABLE = 'housing_precisions' as const;

// Knex accessors — re-exported for backward compatibility with seeds and tests.
export const Precisions = (transaction: Knex<PrecisionDBO> = db) =>
  transaction<PrecisionDBO>(PRECISION_TABLE);

export const HousingPrecisions = (
  transaction: Knex<HousingPrecisionDBO> = db
) => transaction<HousingPrecisionDBO>(HOUSING_PRECISION_TABLE);

const logger = createLogger('precisionRepository');

interface FindOptions {
  filters?: {
    id?: string[];
    housingId?: string[];
  };
}

async function find(options?: FindOptions): Promise<PrecisionDBO[]> {
  let query = kysely
    .selectFrom(PRECISION_TABLE)
    .selectAll(PRECISION_TABLE)
    .orderBy('category')
    .orderBy('order');

  if (options?.filters?.id?.length) {
    query = query.where(`${PRECISION_TABLE}.id`, 'in', options.filters.id);
  }

  if (options?.filters?.housingId?.length) {
    query = (query as any)
      .innerJoin(
        'housingPrecisions',
        `${PRECISION_TABLE}.id`,
        `housingPrecisions.precisionId`
      )
      .where('housingPrecisions.housingId', 'in', options.filters.housingId);
  }

  return query.execute() as Promise<PrecisionDBO[]>;
}

async function link(
  housing: HousingApi,
  precisions: ReadonlyArray<PrecisionApi>
): Promise<void> {
  logger.debug('Linking housing to precisions', {
    housing: housing.id,
    precisions
  });

  await withinKyselyTransaction(async (trx) => {
    await trx
      .deleteFrom('housingPrecisions')
      .where('housingGeoCode', '=', housing.geoCode)
      .where('housingId', '=', housing.id)
      .execute();

    if (precisions.length) {
      await trx
        .insertInto('housingPrecisions')
        .values(precisions.map(toHousingPrecisionInsert(housing)))
        .execute();
    }
  });
}

async function linkMany(
  links: ReadonlyArray<{
    housing: HousingApi;
    precisions: ReadonlyArray<PrecisionApi>;
  }>
): Promise<void> {
  if (links.length === 0) {
    logger.debug('No housings to link. Skipping...');
    return;
  }

  const precisions = links.flatMap((l) => l.precisions);
  logger.debug('Linking many housings to precisions...', {
    housings: links.length,
    precisions: precisions.length
  });

  await withinKyselyTransaction(async (trx) => {
    for (const { housing } of links) {
      await trx
        .deleteFrom('housingPrecisions')
        .where('housingGeoCode', '=', housing.geoCode)
        .where('housingId', '=', housing.id)
        .execute();
    }

    const rows: Insertable<DB['housingPrecisions']>[] = links.flatMap(
      ({ housing, precisions }) => precisions.map(toHousingPrecisionInsert(housing))
    );

    if (rows.length) {
      await trx.insertInto('housingPrecisions').values(rows).execute();
    }

    logger.debug('Linked many housings to precisions', {
      housings: links.length,
      precisions: precisions.length
    });
  });
}

export function formatPrecisionApi(precision: PrecisionApi): PrecisionDBO {
  return {
    id: precision.id,
    label: precision.label,
    category: precision.category,
    order: precision.order
  };
}

export function formatPrecisionHousingApi(housing: HousingApi) {
  return (precision: PrecisionApi): HousingPrecisionDBO => ({
    housing_geo_code: housing.geoCode,
    housing_id: housing.id,
    precision_id: precision.id,
    created_at: new Date()
  });
}

function toHousingPrecisionInsert(
  housing: HousingApi
): (precision: PrecisionApi) => Insertable<DB['housingPrecisions']> {
  return (precision) => ({
    housingGeoCode: housing.geoCode,
    housingId: housing.id,
    precisionId: precision.id,
    createdAt: new Date()
  });
}

const precisionRepository = {
  find,
  link,
  linkMany
};

export default precisionRepository;
