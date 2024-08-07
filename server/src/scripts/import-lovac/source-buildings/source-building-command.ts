import { count } from '@zerologementvacant/utils';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import {
  SourceBuilding,
  sourceBuildingSchema
} from '~/scripts/import-lovac/source-buildings/source-building';
import { createLogger } from '~/infra/logger';
import createSourceBuildingFileRepository from '~/scripts/import-lovac/source-buildings/source-building-file-repository';
import createSourceHousingFileRepository from '~/scripts/import-lovac/source-housings/source-housing-file-repository';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import { createSourceBuildingProcessor } from '~/scripts/import-lovac/source-buildings/source-building-processor';
import { BuildingApi } from '~/models/BuildingApi';
import buildingRepository from '~/repositories/buildingRepository';
import validator from '~/scripts/import-lovac/infra/validator';

const logger = createLogger('sourceBuildingCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
}

export function createSourceBuildingCommand() {
  const reporter = createLoggerReporter<SourceBuilding>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      logger.debug('Starting source building command...', { file, options });

      logger.info('Computing total...');
      const total = await count(
        createSourceBuildingFileRepository(file).stream({
          departments: options.departments
        })
      );

      logger.info('Starting import...', { file });
      await createSourceHousingFileRepository(file)
        .stream({ departments: options.departments })
        .pipeThrough(
          progress({
            initial: 0,
            total: total
          })
        )
        .pipeThrough(
          validator(sourceBuildingSchema, {
            abortEarly: options.abortEarly,
            reporter
          })
        )
        .pipeTo(
          createSourceBuildingProcessor({
            abortEarly: options.abortEarly,
            buildingRepository: {
              async save(building: BuildingApi): Promise<void> {
                if (!options.dryRun) {
                  await buildingRepository.save(building);
                }
              }
            },
            reporter
          })
        );
    } catch (error) {
      logger.error(error);
      throw error;
    } finally {
      reporter.report();
    }
  };
}
