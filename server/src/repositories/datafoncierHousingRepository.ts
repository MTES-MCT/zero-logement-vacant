import highland from 'highland';

import { logger } from '~/infra/logger';
import db from '~/infra/database';
import { DatafoncierHousing } from '@zerologementvacant/shared';
import Stream = Highland.Stream;

const FIELDS = ['*'];

export const datafoncierHousingTable = 'df_housing_nat';
export const DatafoncierHouses = (transaction = db) =>
  transaction<DatafoncierHousing>(datafoncierHousingTable);

class DatafoncierHousingRepository {
  async find(
    where: Partial<DatafoncierHousing>
  ): Promise<DatafoncierHousing[]> {
    const housingList = await DatafoncierHouses()
      .where(where)
      .whereIn('dteloctxt', ['APPARTEMENT', 'MAISON']);
    return housingList;
  }

  async findOne(
    where: Partial<DatafoncierHousing>
  ): Promise<DatafoncierHousing | null> {
    const housing = await DatafoncierHouses()
      .where(where)
      .whereIn('dteloctxt', ['APPARTEMENT', 'MAISON'])
      .first();
    return housing ?? null;
  }

  stream(): Stream<DatafoncierHousing> {
    logger.debug('Stream housing');

    const query = DatafoncierHouses()
      .select(FIELDS)
      .where({
        ccthp: 'L'
      })
      .whereIn('dteloctxt', ['APPARTEMENT', 'MAISON'])
      .stream();

    return highland<DatafoncierHousing>(query);
  }
}

function createDatafoncierHousingRepository() {
  return new DatafoncierHousingRepository();
}

export default createDatafoncierHousingRepository;
