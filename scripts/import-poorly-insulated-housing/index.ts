import highland from 'highland';
import { formatDuration, intervalToDuration } from 'date-fns';
import { logger } from '../../server/utils/logger';
import { tapAsync } from '../sync-attio/stream';
import { HousingApi } from '../../server/models/HousingApi';
import db from '../../server/repositories/db';
import housingRepository from '../../server/repositories/housingRepository';
import createHousingPostgresRepository from './housingPostgresRepository';
import createOwnerPostgresRepository, {
  datafoncierOwnersTable,
  hasAddress,
  hasName,
} from './ownerPostgresRepository';
import { OwnerApi } from '../../server/models/OwnerApi';
import ownerRepository from '../../server/repositories/ownerRepository';
import {
  OwnerDatafoncier,
  ownerDatafoncierSchema,
  toOwnerApi,
} from '../../server/models/OwnerDatafoncier';
import { appendAll } from '../../server/utils/stream';
import validator from './validator';
import fp from 'lodash/fp';
import establishmentRepository from '../../server/repositories/establishmentRepository';
import config from '../../server/utils/config';

const OWNERS_BATCH_SIZE = 1_000;
const HOUSING_BATCH_SIZE = 1_000;

async function run(): Promise<void> {
  const start = new Date();

  const sirens: number[] =
    config.features.dpeExperimentEstablishments.map(Number);
  const establishments = await establishmentRepository.find({
    sirens,
  });
  const geoCodes = fp.uniq(establishments.flatMap((_) => _.geoCodes));

  await preprocess();
  await importOwners(geoCodes);
  await linkOwners();
  await importHousing(geoCodes);
  await cleanUp();

  const end = new Date();
  const duration = intervalToDuration({ start, end });
  const elapsed = formatDuration(duration);
  logger.info(`Done in ${elapsed}.`);
}

async function preprocess(): Promise<void> {
  logger.debug('Removing duplicates from owners...');
  await db.raw(`
     CREATE TABLE unique_owners AS
     SELECT DISTINCT ON (idprodroit) * FROM zlv_proprio_epci2
  `);

  await db.raw(`DELETE FROM zlv_proprio_epci2`);
  await db.raw(`INSERT INTO zlv_proprio_epci2 SELECT * FROM unique_owners`);

  await db.raw(`
     SELECT idprodroit, COUNT(idprodroit) FROM zlv_proprio_epci2
     GROUP BY idprodroit
     HAVING COUNT(idprodroit) > 1;
  `);

  logger.debug('Adding indexes...');
  await db.raw(`ALTER TABLE zlv_proprio_epci2 ADD PRIMARY KEY (idprodroit)`);
  await db.raw(
    `CREATE INDEX idprocpte_dnulp_idx ON zlv_proprio_epci2 (idprocpte, dnulp)`
  );

  logger.debug('Removing unique_owners temporary table...');
  await db.raw(`DROP TABLE unique_owners`);
}

async function cleanUp(): Promise<void> {
  logger.debug('Cleaning up...');
  await db.raw(`
    DROP TABLE zlv_proprio_epci2;
    DROP TABLE zlv_logt_epic;
  `);
}

async function importOwners(geoCodes: string[]): Promise<void> {
  logger.info('Importing owners...');
  let count = 0;

  return new Promise((resolve, reject) => {
    createOwnerPostgresRepository()
      .stream({ geoCodes })
      .batch(OWNERS_BATCH_SIZE)
      .tap((records) => {
        logger.debug(`Saving ${records.length} owners...`);
        count += records.length;
      })
      .consume(tapAsync(saveOwners))
      .stopOnError((error) => {
        reject(error);
      })
      .done(() => {
        logger.info(`${count} owners imported.`);
        resolve();
      });
  });
}

async function linkOwners(): Promise<void> {
  logger.info('Linking owner id to datafoncier idpersonne...');
  let count = 0;

  const tableExists = await db.schema.hasTable('zlv_datafoncier_owners');
  if (!tableExists) {
    await db.schema.createTable('zlv_datafoncier_owners', (table) => {
      table.uuid('zlv_id').references('id').inTable('owners').notNullable();
      table
        .string('datafoncier_id', 13)
        .references('idprodroit')
        .inTable('zlv_proprio_epci2')
        .notNullable();
      table.unique(['zlv_id', 'datafoncier_id'], {
        indexName: 'zlv_datafoncier_owners_zlv_id_datafoncier_id_unique_idx',
        useConstraint: true,
      });
      table.index(
        ['datafoncier_id'],
        'zlv_datafoncier_owners_datafoncier_id_idx'
      );
    });
    logger.debug('Table zlv_datafoncier_owners created.');
  } else {
    logger.debug('Table zlv_datafoncier_owners exists. Skipping...');
  }

  return new Promise((resolve, reject) => {
    const query = db<OwnerDatafoncier>(datafoncierOwnersTable)
      .select(
        'idprodroit',
        'dlign3',
        'dlign4',
        'dlign5',
        'dlign6',
        'ddenom',
        'catpro2txt',
        'catpro3txt',
        'jdatnss'
      )
      .modify(hasAddress())
      .modify(hasName())
      .stream();

    return highland<OwnerDatafoncier>(query)
      .map(validator.validate(ownerDatafoncierSchema))
      .map((owner) => ({ datafoncier: owner }))
      .through(
        appendAll({
          zlv: ({ datafoncier }) => {
            const owner = toOwnerApi(datafoncier);
            return ownerRepository.findOne({
              fullName: owner.fullName,
              rawAddress: owner.rawAddress,
              birthDate: owner.birthDate,
            });
          },
        })
      )
      .map(({ datafoncier, zlv }) => {
        if (!zlv) {
          throw new Error('ZLV has no owner for the given Datafoncier owner');
        }
        return { datafoncier, zlv };
      })
      .batch(OWNERS_BATCH_SIZE)
      .tap((records) => {
        logger.debug(`Saving ${records.length} links...`);
        count += records.length;
      })
      .consume(tapAsync(saveLinks))
      .stopOnError((error) => {
        reject(error);
      })
      .done(() => {
        logger.info(`${count} links created.`);
        resolve();
      });
  });
}

async function importHousing(geoCodes: string[]): Promise<void> {
  logger.info('Importing housing...');
  let count = 0;

  return new Promise((resolve, reject) => {
    createHousingPostgresRepository()
      .stream({
        geoCodes,
      })
      .batch(HOUSING_BATCH_SIZE)
      .tap((records) => {
        logger.debug(`Saving ${records.length} housing...`);
        count += records.length;
      })
      .consume(tapAsync(saveHousingList))
      .stopOnError((error) => {
        reject(error);
      })
      .done(() => {
        logger.info(`${count} housing imported.`);
        resolve();
      });
  });
}

async function saveLinks(
  links: { datafoncier: OwnerDatafoncier; zlv: OwnerApi }[]
): Promise<void> {
  const dbos = links.map((link) => ({
    datafoncier_id: link.datafoncier.idprodroit,
    zlv_id: link.zlv.id,
  }));
  await db('zlv_datafoncier_owners').insert(dbos);
}

async function saveOwners(owners: OwnerApi[]): Promise<void> {
  await ownerRepository.saveMany(owners, { onConflict: 'ignore' });
}

async function saveHousingList(housingList: HousingApi[]): Promise<void> {
  await housingRepository.saveMany(housingList, { onConflict: 'ignore' });
}

run()
  .catch(logger.error.bind(logger))
  .finally(() => db.destroy());
