import highland from 'highland';

import { logger } from '~/infra/logger';
import db from '~/infra/database';
import { DatafoncierHousing } from '@zerologementvacant/models';
import Stream = Highland.Stream;

export const datafoncierHousingTable = 'df_housing_nat_2024';
export const DatafoncierHouses = (transaction = db) =>
  transaction<DatafoncierHousing>(datafoncierHousingTable);

class DatafoncierHousingRepository {
  async find(
    where: Partial<DatafoncierHousing>
  ): Promise<DatafoncierHousing[]> {
    const housingList = await list().where(where);
    return housingList;
  }

  async findOne(
    where: Partial<DatafoncierHousing>
  ): Promise<DatafoncierHousing | null> {
    const housing = await list().where(where).first();
    return housing ?? null;
  }

  stream(): Stream<DatafoncierHousing> {
    logger.debug('Streaming Datafoncier housings...');

    const query = list()
      .where({
        ccthp: 'L'
      })
      .stream();

    return highland<DatafoncierHousing>(query);
  }
}

function list() {
  return DatafoncierHouses()
    .select('*')
    .select(db.raw('ST_AsGeoJson(ban_geom) AS ban_geom'))
    .select(db.raw('ST_AsGeoJson(geomloc) AS geomloc'))
    .select(db.raw('ST_AsGeoJson(geomrnb) AS geomrnb'))
    .whereIn('dteloctxt', ['APPARTEMENT', 'MAISON']);
}

function createDatafoncierHousingRepository() {
  return new DatafoncierHousingRepository();
}

export default createDatafoncierHousingRepository;
