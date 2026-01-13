import { Knex } from 'knex';

import db from '~/infra/database';
import { withinTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import { HousingApi } from '~/models/HousingApi';
import { PrecisionApi } from '~/models/PrecisionApi';

export const PRECISION_TABLE = 'precisions';
export const Precisions = (transaction: Knex<PrecisionDBO> = db) =>
  transaction(PRECISION_TABLE);

export const HOUSING_PRECISION_TABLE = 'housing_precisions';
export const HousingPrecisions = (
  transaction: Knex<HousingPrecisionDBO> = db
) => transaction(HOUSING_PRECISION_TABLE);

export type PrecisionDBO = PrecisionApi;
export type HousingPrecisionDBO = {
  housing_geo_code: string;
  housing_id: string;
  precision_id: string;
  created_at: Date | string;
};

interface FindOptions {
  filters?: {
    id?: string[];
    housingId?: string[];
  };
}

const logger = createLogger('precisionRepository');

async function find(options?: FindOptions): Promise<PrecisionDBO[]> {
  const precisions: PrecisionDBO[] = await Precisions()
    .select(`${PRECISION_TABLE}.*`)
    .modify((query) => {
      if (options?.filters?.id?.length) {
        query.whereIn(`${PRECISION_TABLE}.id`, options.filters.id);
      }

      if (options?.filters?.housingId?.length) {
        query
          .join(
            HOUSING_PRECISION_TABLE,
            `${PRECISION_TABLE}.id`,
            `${HOUSING_PRECISION_TABLE}.precision_id`
          )
          .whereIn(
            `${HOUSING_PRECISION_TABLE}.housing_id`,
            options?.filters.housingId
          );
      }
    })
    .orderBy(['category', 'order']);

  return precisions;
}

async function link(
  housing: HousingApi,
  precisions: ReadonlyArray<PrecisionApi>
): Promise<void> {
  logger.debug('Linking housing to precisions', {
    housing: housing.id,
    precisions
  });

  await withinTransaction(async (transaction) => {
    await HousingPrecisions(transaction)
      .where({
        housing_geo_code: housing.geoCode,
        housing_id: housing.id
      })
      .delete();

    if (precisions.length) {
      const housingPrecisions: ReadonlyArray<HousingPrecisionDBO> =
        precisions.map((precision) => ({
          housing_geo_code: housing.geoCode,
          housing_id: housing.id,
          precision_id: precision.id,
          created_at: new Date()
        }));
      await HousingPrecisions(transaction).insert(housingPrecisions);
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

  const precisions = links.flatMap((link) => link.precisions);
  logger.debug('Linking many housings to precisions...', {
    housings: links.length,
    precisions: precisions.length
  });

  await withinTransaction(async (transaction) => {
    await HousingPrecisions(transaction)
      .whereIn(
        ['housing_geo_code', 'housing_id'],
        links.map((link) => [link.housing.geoCode, link.housing.id])
      )
      .delete();

    const housingPrecisions: HousingPrecisionDBO[] = links.flatMap((link) =>
      link.precisions.map((precision) => ({
        housing_geo_code: link.housing.geoCode,
        housing_id: link.housing.id,
        precision_id: precision.id,
        created_at: new Date()
      }))
    );
    if (housingPrecisions.length) {
      await HousingPrecisions(transaction).insert(housingPrecisions);
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

const precisionRepository = {
  find,
  link,
  linkMany
};

export default precisionRepository;
