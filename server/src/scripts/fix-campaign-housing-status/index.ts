import { HousingStatus } from '@zerologementvacant/models';
import { groupBy } from '@zerologementvacant/utils/node';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';

import { campaignsHousingTable } from '~/repositories/campaignHousingRepository';
import { campaignsTable } from '~/repositories/campaignRepository';
import {
  Housing,
  HousingRecordDBO,
  housingTable
} from '~/repositories/housingRepository';

async function run() {
  const stream = Housing()
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
    .whereIn(`${campaignsTable}.status`, ['sending', 'in-progress', 'archived'])
    .where(`${housingTable}.status`, HousingStatus.NEVER_CONTACTED)
    .select(`${campaignsTable}.id as campaign`, `${housingTable}.*`)
    .orderBy(`${campaignsTable}.id`)
    .stream();

  await Readable.toWeb(stream)
    .pipeThrough(
      groupBy<HousingRecordDBO & { campaign: string }>(
        (a, b) => a.campaign === b.campaign
      )
    )
    .pipeTo(output({ destination: 'file' }));
}

interface OutputOptions {
  destination: 'file' | 'console';
}

function output(
  options?: OutputOptions
): WritableStream<ReadonlyArray<HousingRecordDBO>> {
  if (options?.destination === 'file') {
    const stream = createWriteStream(import.meta.dirname + '/output.jsonl');
    return new WritableStream<ReadonlyArray<HousingRecordDBO>>({
      async write(housings) {
        housings.forEach((housing) => {
          stream.write(JSON.stringify(housing) + '\n');
        });
      },
      async close() {
        stream.end();
      }
    });
  }

  return new WritableStream<ReadonlyArray<HousingRecordDBO>>({
    async write(housings) {
      housings.forEach((housing) => {
        console.log(housing);
      });
    }
  });
}

run().finally(() => {
  process.exit();
});
