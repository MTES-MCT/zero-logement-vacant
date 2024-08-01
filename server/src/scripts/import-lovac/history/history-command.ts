import fs from 'node:fs';
import { Readable } from 'node:stream';

import { countLines } from '@zerologementvacant/utils';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { History } from '~/scripts/import-lovac/history/history';
import { createLogger } from '~/infra/logger';
import createHistoryFileRepository from '~/scripts/import-lovac/history/history-file-repository';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import { HousingApi } from '~/models/HousingApi';
import { Housing } from '~/repositories/housingRepository';
import { historyProcessor } from '~/scripts/import-lovac/history/history-processor';

const logger = createLogger('historyCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  dryRun?: boolean;
}

export function createHistoryCommand() {
  const reporter = createLoggerReporter<History>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      logger.info('Computing total...');
      const total = await countLines(Readable.toWeb(fs.createReadStream(file)));

      logger.info('Starting import...', { file });
      await createHistoryFileRepository(file)
        .stream()
        .pipeThrough(
          progress({
            initial: 0,
            total
          })
        )
        .pipeTo(
          historyProcessor({
            abortEarly: options.abortEarly,
            reporter,
            housingRepository: {
              async update(
                { geoCode, localId }: Pick<HousingApi, 'geoCode' | 'localId'>,
                housing: Pick<HousingApi, 'dataFileYears'>
              ): Promise<void> {
                if (!options.dryRun) {
                  await Housing()
                    .where({
                      geo_code: geoCode,
                      local_id: localId
                    })
                    .update({
                      data_file_years: housing.dataFileYears
                    });
                }
              }
            }
          })
        );
    } finally {
      reporter.report();
    }
  };
}
