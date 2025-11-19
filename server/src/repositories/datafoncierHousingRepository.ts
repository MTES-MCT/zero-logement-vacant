import { DatafoncierHousing } from '@zerologementvacant/models';
import type { Knex } from 'knex';

import db from '~/infra/database';

export const datafoncierHousingTable = 'df_housing_nat_2024';
export const DatafoncierHouses = (transaction = db) =>
  transaction<DatafoncierHousing>(datafoncierHousingTable);

interface DatafoncierHousingFilters {
  idlocal?: string;
  idpropcte?: string;
}

class DatafoncierHousingRepository {
  async find(where?: DatafoncierHousingFilters): Promise<DatafoncierHousing[]> {
    return list().modify((query) => {
      if (where) {
        query.where(where);
      }
    });
  }

  async findOne(
    where: DatafoncierHousingFilters
  ): Promise<DatafoncierHousing | null> {
    const housing: DatafoncierHousing | null = await list()
      .where(where)
      .first();
    return housing ?? null;
  }
}

function list(): Knex.QueryBuilder<DatafoncierHousing> {
  return DatafoncierHouses()
    .select('*')
    .select(
      db.raw('ST_AsGeoJson(ST_Transform(ban_geom, 4326))::json AS ban_geom')
    )
    .select(
      db.raw('ST_AsGeoJson(ST_Transform(geomloc, 4326))::json AS geomloc')
    )
    .select(
      db.raw('ST_AsGeoJson(ST_Transform(geomrnb, 4326))::json AS geomrnb')
    )
    .whereIn('dteloctxt', ['APPARTEMENT', 'MAISON']);
}

function createDatafoncierHousingRepository() {
  return new DatafoncierHousingRepository();
}

export default createDatafoncierHousingRepository;
