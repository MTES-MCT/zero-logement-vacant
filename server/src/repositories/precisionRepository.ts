import { Knex } from 'knex';

import db from '~/infra/database';
import { getTransaction } from '~/infra/database/transaction';
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
  const transaction = getTransaction();
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
}

const precisionRepository = {
  find,
  link
};

export default precisionRepository;
