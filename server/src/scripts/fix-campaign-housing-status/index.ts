import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { groupBy } from '@zerologementvacant/utils/node';
import { Readable } from 'node:stream';
import { v4 as uuidv4 } from 'uuid';
import type { HousingEventApi } from '~/models/EventApi';

import UserMissingError from '~/errors/userMissingError';
import { startTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import type { UserApi } from '~/models/UserApi';
import { campaignsHousingTable } from '~/repositories/campaignHousingRepository';
import { campaignsTable } from '~/repositories/campaignRepository';
import eventRepository from '~/repositories/eventRepository';
import housingRepository, {
  Housing,
  HousingRecordDBO,
  housingTable
} from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';

const logger = createLogger('script');

async function run() {
  const creator = await userRepository.getByEmail(
    'admin@zerologementvacant.beta.gouv.fr'
  );
  if (!creator) {
    throw new UserMissingError('admin@zerologementvacant.beta.gouv.fr');
  }

  await Readable.toWeb(input())
    .pipeThrough(
      groupBy<HousingRecordDBO & { campaign: string }>(
        (a, b) => a.campaign === b.campaign
      )
    )
    .pipeTo(writer({ creator }));
}

interface WriterOptions {
  creator: UserApi;
}

function writer(options: WriterOptions) {
  const now = new Date().toJSON();

  return new WritableStream<
    ReadonlyArray<HousingRecordDBO & { campaign: string }>
  >({
    async write(housings) {
      const events = housings.map<HousingEventApi>((housing) => ({
        id: uuidv4(),
        type: 'housing:status-updated',
        name: 'Changement de statut de suivi',
        nextOld: {
          status: HOUSING_STATUS_LABELS[HousingStatus.NEVER_CONTACTED]
        },
        nextNew: {
          status: HOUSING_STATUS_LABELS[HousingStatus.WAITING]
        },
        createdAt: now,
        createdBy: options.creator.id,
        housingGeoCode: housing.geo_code,
        housingId: housing.id
      }));

      await startTransaction(async () => {
        logger.debug('Processing...', {
          campaign: housings[0].campaign,
          housings: housings.length,
          events: events.length
        });
        await Promise.all([
          eventRepository.insertManyHousingEvents(events),
          housingRepository.updateMany(
            housings.map((housing) => ({
              geoCode: housing.geo_code,
              id: housing.id
            })),
            {
              status: HousingStatus.WAITING
            }
          )
        ]);
      });
    }
  });
}

function input() {
  return Housing()
    .join(campaignsHousingTable, (join) => {
      join.on({
        [`${campaignsHousingTable}.housing_geo_code`]: `${housingTable}.geo_code`,
        [`${campaignsHousingTable}.housing_id`]: `${housingTable}.id`
      });
    })
    .join(
      campaignsTable,
      `${campaignsHousingTable}.campaign_id`,
      `${campaignsTable}.id`
    )
    .whereIn(`${campaignsTable}.status`, ['sending', 'in-progress'])
    .where(`${housingTable}.status`, HousingStatus.NEVER_CONTACTED)
    .select(`${campaignsTable}.id as campaign`, `${housingTable}.*`)
    .orderBy(`${campaignsTable}.id`)
    .stream();
}

run().finally(() => {
  process.exit();
});
