import progress from 'cli-progress';
import highland from 'highland';
import fp from 'lodash/fp';
import { v4 as uuidv4 } from 'uuid';

import { bulkSave, compare, Comparison } from './action';
import housingRepository from '~/repositories/housingRepository';
import db from '~/infra/database/';
import { appendAll, errorHandler } from '~/utils/stream';
import lovacRepository, {
  AdditionalOwnerIndex,
  LovacOwner,
} from './lovac-repository';
import modificationRepository from './modification-repository';
import { OwnerDBO, ownerTable } from '~/repositories/ownerRepository';
import config from '~/infra/config';
import { tapAsync } from '../shared';
import { logger } from '~/infra/logger';

const BATCH_SIZE = config.app.batchSize;

function run() {
  logger.info('Starting import...');
  const bar = new progress.SingleBar(
    {
      etaBuffer: 1000,
      etaAsynchronousUpdate: true,
      fps: 10,
      format:
        '{bar} | {percentage}% | ETA: {eta_formatted} | {value}/{total} housing',
    },
    progress.Presets.shades_classic,
  );

  highland([
    highland(housingRepository.countVacant()),
    highland(lovacRepository.count()),
  ])
    .parallel(2)
    .toArray(([count, lovac]) => {
      logger.info(`Found ${count} vacant housing in ZLV.`);
      logger.info(`Found ${lovac} new Lovac housing missing from ZLV.`);

      let imported = 0;

      owners(count).done(() => {
        logger.info('Importing housing...');
        bar.start(count + lovac, 0);

        highland([oldHousing(), newHousing()])
          .merge()
          .map(compare)
          .batch(BATCH_SIZE)
          .consume(tapAsync(bulkSave))
          .tap((actions) => {
            bar.increment(actions.length);
            imported += actions.length;
            logger.info(`${imported} / ${count + lovac} housing`);
          })
          .through(errorHandler())
          .done(async () => {
            bar.stop();
            await db.destroy();
          });
      });
    });
}

function owners(count: number) {
  logger.info('Importing owners...');
  const bar = new progress.SingleBar(
    {
      etaBuffer: 1000,
      etaAsynchronousUpdate: true,
      fps: 10,
      format:
        '{bar} | {percentage}% | ETA: {eta_formatted} | {value}/{total} housing',
    },
    progress.Presets.shades_classic,
  );

  bar.start(count, 0);
  return lovacRepository
    .streamOwners()
    .consume(tapAsync(saveOwners))
    .tap(() => {
      bar.increment();
    })
    .on('end', () => {
      bar.stop();
    });
}

async function saveOwners(lovacOwner: LovacOwner): Promise<void> {
  function createCoowner(i: AdditionalOwnerIndex): OwnerDBO | null {
    return lovacOwner[`full_name${i}`] && lovacOwner[`owner_raw_address${i}`]
      ? ({
          id: uuidv4(),
          full_name: lovacOwner[`full_name${i}`],
          raw_address: lovacOwner[`owner_raw_address${i}`],
          birth_date: lovacOwner[`birth_date${i}`],
        } as OwnerDBO)
      : null;
  }
  const owners: OwnerDBO[] = [
    {
      id: uuidv4(),
      full_name: lovacOwner.full_name,
      raw_address: lovacOwner.owner_raw_address,
      birth_date: lovacOwner.birth_date,
      owner_kind: lovacOwner.owner_kind,
      owner_kind_detail: lovacOwner.owner_kind_detail,
      administrator: lovacOwner.administrator,
    },
    createCoowner(2),
    createCoowner(3),
    createCoowner(4),
    createCoowner(5),
    createCoowner(6),
  ].filter((owner): owner is NonNullable<OwnerDBO> => owner !== null);

  const unique = fp.uniqWith<OwnerDBO>(
    (a, b) =>
      fp.isEqual(a.full_name, b.full_name) &&
      fp.isEqual(a.raw_address, b.raw_address) &&
      fp.isEqual(a.birth_date, b.birth_date),
  );

  const ownersWithoutBirthdate = unique(owners).filter((_) => !_.birth_date);
  const ownersWithBirthdate = unique(owners).filter((_) => !!_.birth_date);
  const save = [];
  if (ownersWithBirthdate.length > 0) {
    save.push(
      db(ownerTable)
        .insert(ownersWithBirthdate)
        .onConflict(['full_name', 'raw_address', 'birth_date'])
        .merge(['administrator', 'owner_kind', 'owner_kind_detail']),
    );
  }
  if (ownersWithoutBirthdate.length > 0) {
    save.push(
      db(ownerTable)
        .insert(ownersWithoutBirthdate)
        .onConflict(
          db.raw(
            '(full_name, raw_address, (birth_date IS NULL)) where birth_date is null',
          ),
        )
        .merge(['administrator', 'owner_kind', 'owner_kind_detail']),
    );
  }
  await Promise.all(save).catch((error) => {
    logger.info(error);
    logger.info('Owners', owners);
    throw error;
  });
}

function oldHousing() {
  return housingRepository
    .stream({
      filters: {},
      includes: ['owner'],
    })
    .map((housing) => ({ before: housing }))
    .through(
      appendAll({
        now: ({ before }) =>
          lovacRepository.findOne({
            localId: before.localId,
          }),
        modifications: ({ before }) =>
          modificationRepository.find({
            housingId: before.id,
          }),
      }),
    )
    .map((_) => _ as Comparison);
}

function newHousing(): Highland.Stream<Comparison> {
  return lovacRepository.streamNewHousing().map<Comparison>((housing) => ({
    before: null,
    now: housing,
    modifications: [],
  }));
}

run();
