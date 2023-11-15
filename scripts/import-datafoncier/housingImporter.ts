import Stream = Highland.Stream;

import { HousingRecordApi } from '../../server/models/HousingApi';
import { tapAsync, toHousingRecordApi } from '../shared';
import createDatafoncierHousingRepository from '../../server/repositories/datafoncierHousingRepository';
import housingRepository from '../../server/repositories/housingRepository';
import { logger } from '../../server/utils/logger';
import { DatafoncierHousing } from '../../shared';

export function housingImporter(): Stream<HousingRecordApi> {
  return createDatafoncierHousingRepository()
    .stream()
    .consume(tapAsync(processHousing))
    .map(toHousingRecordApi({ source: 'datafoncier-import' }))
    .errors((error) => {
      logger.error(error);
    });
}

export async function processHousing(
  datafoncierHousing: DatafoncierHousing
): Promise<void> {
  await housingRepository.save(
    toHousingRecordApi({ source: 'datafoncier-import' }, datafoncierHousing),
    { onConflict: 'ignore' }
  );
}

export default housingImporter;
