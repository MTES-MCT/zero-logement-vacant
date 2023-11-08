import Stream = Highland.Stream;

import { HousingRecordApi } from '../../server/models/HousingApi';
import { tapAsync, toHousingRecordApi } from '../shared';
import createDatafoncierHousingRepository from './datafoncierHousingRepository';
import housingRepository from '../../server/repositories/housingRepository';
import { logger } from '../../server/utils/logger';
import { DatafoncierHousing } from '../../shared';

export function housingImporter(): Stream<HousingRecordApi> {
  return createDatafoncierHousingRepository()
    .stream()
    .consume(tapAsync(processHousing))
    .map(toHousingRecordApi)
    .errors((error) => {
      logger.error(error);
    });
}

export async function processHousing(
  dfHousing: DatafoncierHousing
): Promise<void> {
  await housingRepository.save(toHousingRecordApi(dfHousing), {
    onConflict: 'ignore',
  });
}

export default housingImporter;
