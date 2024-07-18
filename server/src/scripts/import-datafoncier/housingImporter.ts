import Stream = Highland.Stream;

import { HousingRecordApi } from '~/models/HousingApi';
import { tapAsync, toHousingRecordApi } from '../shared';
import createDatafoncierHousingRepository from '~/repositories/datafoncierHousingRepository';
import housingRepository from '~/repositories/housingRepository';
import { logger } from '~/infra/logger';
import { DatafoncierHousing } from '@zerologementvacant/shared';

export function housingImporter(): Stream<HousingRecordApi> {
  return createDatafoncierHousingRepository()
    .stream()
    .consume(tapAsync(processHousing))
    .map(toHousingRecordApi({ source: 'datafoncier-import', }))
    .errors((error) => {
      logger.error(error);
    });
}

export async function processHousing(
  datafoncierHousing: DatafoncierHousing
): Promise<void> {
  await housingRepository.save(
    toHousingRecordApi({ source: 'datafoncier-import', }, datafoncierHousing),
    { onConflict: 'ignore', }
  );
}

export default housingImporter;
