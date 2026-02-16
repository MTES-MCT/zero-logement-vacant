import {
  HOUSING_STATUS_LABELS,
  HousingStatus
} from '@zerologementvacant/models';
import { groupBy } from '@zerologementvacant/utils/node';
import jsonlines from 'jsonlines';
import fs from 'node:fs';
import path from 'node:path';
import { Readable, Transform } from 'node:stream';
import { v4 as uuidv4 } from 'uuid';
import type { HousingEventApi } from '~/models/EventApi';

import UserMissingError from '~/errors/userMissingError';
import { startTransaction } from '~/infra/database/transaction';
import { createLogger } from '~/infra/logger';
import type { UserApi } from '~/models/UserApi';
import eventRepository from '~/repositories/eventRepository';
import housingRepository from '~/repositories/housingRepository';
import userRepository from '~/repositories/userRepository';

const logger = createLogger('script');

async function run() {
  const creator = await userRepository.getByEmail(
    'admin@zerologementvacant.beta.gouv.fr'
  );
  if (!creator) {
    throw new UserMissingError('admin@zerologementvacant.beta.gouv.fr');
  }

  await input()
    .pipeThrough(groupBy((a, b) => a.campaign_id === b.campaign_id))
    .pipeTo(writer({ creator }));
}

interface WriterOptions {
  creator: UserApi;
}

function writer(options: WriterOptions) {
  const now = new Date().toJSON();

  return new WritableStream<
    ReadonlyArray<Input>
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
        housingGeoCode: housing.housing_geo_code,
        housingId: housing.housing_id
      }));

      await startTransaction(async () => {
        logger.debug('Processing...', {
          campaign: housings[0].campaign_id,
          housings: housings.length,
          events: events.length
        });
        await Promise.all([
          eventRepository.insertManyHousingEvents(events),
          housingRepository.updateMany(
            housings.map((housing) => ({
              geoCode: housing.housing_geo_code,
              id: housing.housing_id
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

interface Input {
  campaign_id: string;
  campaign_title: string;
  housing_geo_code: string;
  housing_id: string;
}

function input(): ReadableStream<Input> {
  const parser = jsonlines.parse({ emitInvalidLines: true });
  const stream = fs.createReadStream(
    path.join(import.meta.dirname, 'touched.jsonl'),
    'utf-8'
  );

  return Readable.toWeb(stream).pipeThrough(Transform.toWeb(parser));
}

run().finally(() => {
  process.exit();
});
