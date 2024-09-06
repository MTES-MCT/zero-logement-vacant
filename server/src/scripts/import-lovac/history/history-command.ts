import { count } from '@zerologementvacant/utils';
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
  departments?: string[];
  dryRun?: boolean;
}

export function createHistoryCommand() {
  const reporter = createLoggerReporter<History>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      logger.info('Computing total...');
      const total = await count(
        createHistoryFileRepository(file).stream({
          departments: options.departments
        })
      );

      logger.info('Starting import...', { file });
      await createHistoryFileRepository(file)
        .stream({
          departments: options.departments
        })
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
