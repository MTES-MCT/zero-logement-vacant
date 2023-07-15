import { formatDuration, intervalToDuration } from 'date-fns';
import fp from 'lodash/fp';
import { logger } from '../../server/utils/logger';
import establishmentRepository from '../../server/repositories/establishmentRepository';
import { tapAsync } from '../sync-attio/stream';
import createHousingDatafoncierStream from './housingDatafoncierRepository';
import config from '../../server/utils/config';
import { HousingRecordApi } from '../../server/models/HousingApi';
import db from '../../server/repositories/db';
import {
  formatHousingRecordApi,
  housingTable,
} from '../../server/repositories/housingRepository';
import { Knex } from 'knex';

const HOUSING_BATCH_SIZE = 1_000;

async function run(): Promise<void> {
  const start = new Date();

  const sirens: number[] =
    config.features.dpeExperimentEstablishments.map(Number);
  const establishments = await establishmentRepository.listWithFilters({
    sirens,
  });
  const geoCodes = fp.uniq(establishments.flatMap((_) => _.geoCodes));

  await importHousing(geoCodes);

  const end = new Date();
  const duration = intervalToDuration({ start, end });
  const elapsed = formatDuration(duration);
  logger.info(`Done in ${elapsed}.`);
}

async function importHousing(geoCodes: string[]): Promise<void> {
  logger.info('Importing housing...');

  const transaction = await db.transaction();

  return new Promise((resolve, reject) => {
    createHousingDatafoncierStream()
      .stream({
        geoCodes,
      })
      .batch(HOUSING_BATCH_SIZE)
      .tap((records) => {
        logger.debug(`Saving ${records.length} records...`);
      })
      .consume(tapAsync(createHousingSaver(transaction)))
      .stopOnError((error) => {
        transaction.rollback(error);
        reject(error);
      })
      .done(() => {
        logger.info('Housing imported.');
        transaction.commit();
        resolve();
      });
  });
}

function createHousingSaver(transaction: Knex.Transaction) {
  return async (housingList: HousingRecordApi[]): Promise<void> => {
    await transaction(housingTable)
      .insert(housingList.map(formatHousingRecordApi))
      .onConflict('local_id')
      .ignore();
  };
}

run()
  .catch(logger.error.bind(logger))
  .finally(() => db.destroy());
