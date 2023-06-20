import { formatDuration, intervalToDuration } from 'date-fns';

import createHousingFileStream from './housingFileStreamRepository';
import { errorHandler } from '../../server/utils/stream';
import { logger } from '../../server/utils/logger';
import establishmentRepository from '../../server/repositories/establishmentRepository';
import housingRepository from '../../server/repositories/housingRepository';
import { tapAsync } from '../sync-attio/stream';
import ownerRepository from '../../server/repositories/ownerRepository';
import createOwnerFileStream from './ownerFileStreamRepository';

const OWNER_BATCH_SIZE = 200;
const HOUSING_BATCH_SIZE = 500;

async function run(): Promise<void> {
  const sirens: number[] = [246200364];
  const start = new Date();

  const establishments = await establishmentRepository.listWithFilters({
    sirens,
  });
  const geoCodes = establishments.flatMap((_) => _.geoCodes);

  await importOwners(geoCodes);
  await importHousing(geoCodes);

  const end = new Date();
  const duration = intervalToDuration({ start, end });
  const elapsed = formatDuration(duration);
  logger.info(`Done in ${elapsed}.`);
}

function importOwners(geoCodes: string[]): Promise<void> {
  logger.info('Importing owners...');

  const file = 'TODO';
  return new Promise((resolve) => {
    createOwnerFileStream(file)
      .stream({
        geoCodes,
      })
      .batch(OWNER_BATCH_SIZE)
      .consume(tapAsync(ownerRepository.saveMany))
      .through(errorHandler())
      .done(() => {
        logger.info('Owners imported.');
        resolve();
      });
  });
}

function importHousing(geoCodes: string[]): Promise<void> {
  logger.info('Importing housing...');

  const file = 'TODO';
  return new Promise((resolve) => {
    createHousingFileStream(file)
      .stream({
        geoCodes,
      })
      .batch(HOUSING_BATCH_SIZE)
      .consume(
        tapAsync((housingList) =>
          housingRepository.saveMany(housingList, {
            onConflict: 'ignore',
          })
        )
      )
      .through(errorHandler())
      .done(() => {
        logger.info('Housing imported.');
        resolve();
      });
  });
}

run().catch(logger.error);
