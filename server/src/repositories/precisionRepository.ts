import { Knex } from 'knex';

import db from '~/infra/database';
import { PrecisionApi } from '~/models/PrecisionApi';
import { HousingApi } from '~/models/HousingApi';
import { getTransaction } from '~/infra/database/transaction';

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
};

async function find(): Promise<PrecisionDBO[]> {
  const precisions = await Precisions().select().orderBy(['category', 'order']);
  return precisions;
}

async function link(
  housing: HousingApi,
  precisions: ReadonlyArray<PrecisionApi>
): Promise<void> {
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
        precision_id: precision.id
      }));
    await HousingPrecisions(transaction).insert(housingPrecisions);
  }
}

const precisionRepository = {
  find,
  link
};

export default precisionRepository;
