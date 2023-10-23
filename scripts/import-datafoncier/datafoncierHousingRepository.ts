import Stream = Highland.Stream;

import { DatafoncierHousing } from '../shared';
import { logger } from '../../server/utils/logger';
import db from '../../server/repositories/db';

const FIELDS = ['*'];
export const datafoncierHousingTable = 'df_housing_nat';

class DatafoncierHousingRepository {
  stream(): Stream<DatafoncierHousing> {
    logger.debug('Stream housing');

    const query = db<DatafoncierHousing>(datafoncierHousingTable)
      .select(FIELDS)
      .where({
        ccthp: 'L',
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
