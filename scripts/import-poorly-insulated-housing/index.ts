import { formatDuration, intervalToDuration } from 'date-fns';
import { errorHandler } from '../../server/utils/stream';
import { logger } from '../../server/utils/logger';
import establishmentRepository from '../../server/repositories/establishmentRepository';
import housingRepository from '../../server/repositories/housingRepository';
import { tapAsync } from '../sync-attio/stream';
import ownerRepository from '../../server/repositories/ownerRepository';
import createOwnerDatafoncierStream from './ownerDatafoncierRepository';
import createHousingDatafoncierStream from './housingDatafoncierRepository';
import config from '../../server/utils/config';
import fp from 'lodash/fp';

const OWNER_BATCH_SIZE = 200;
const HOUSING_BATCH_SIZE = 500;

async function run(): Promise<void> {
  const start = new Date();

  const sirens: number[] =
    config.features.dpeExperimentEstablishments.map(Number);
  const establishments = await establishmentRepository.listWithFilters({
    sirens,
  });
  const geoCodes = fp.uniq(establishments.flatMap((_) => _.geoCodes));

  await importOwners(geoCodes);
  await importHousing(geoCodes);

  const end = new Date();
  const duration = intervalToDuration({ start, end });
  const elapsed = formatDuration(duration);
  logger.info(`Done in ${elapsed}.`);
}

function importOwners(geoCodes: string[]): Promise<void> {
  logger.info('Importing owners...');

  return new Promise((resolve) => {
    createOwnerDatafoncierStream()
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

  return new Promise((resolve) => {
    createHousingDatafoncierStream()
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
