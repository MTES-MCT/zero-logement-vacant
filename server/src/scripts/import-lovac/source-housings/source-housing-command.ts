import { count } from '@zerologementvacant/utils';
import createSourceHousingFileRepository from '~/scripts/import-lovac/source-housings/source-housing-file-repository';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceHousing,
  sourceHousingSchema
} from '~/scripts/import-lovac/source-housings/source-housing';
import { createSourceHousingProcessor } from '~/scripts/import-lovac/source-housings/source-housing-processor';
import { HousingApi } from '~/models/HousingApi';
import housingRepository, {
  Housing,
  HousingRecordDBO
} from '~/repositories/housingRepository';
import eventRepository from '~/repositories/eventRepository';
import { createLogger } from '~/infra/logger';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { createHousingProcessor } from '~/scripts/import-lovac/housings/housing-processor';
import { Readable } from 'node:stream';

const logger = createLogger('sourceHousingCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  dryRun?: boolean;
}

export function createSourceHousingCommand() {
  const sourceHousingReporter = createLoggerReporter<SourceHousing>();
  const housingReporter = createLoggerReporter<HousingRecordDBO>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    logger.info('Computing total...');

    const total = await count(
      createSourceHousingFileRepository(file).stream({
        departments: ['01']
      })
    );

    logger.info('Starting import...', { file });
    await createSourceHousingFileRepository(file)
      .stream({
        departments: ['01']
      })
      .pipeThrough(
        progress({
          initial: 0,
          total: total
        })
      )
      .pipeThrough(
        validator(sourceHousingSchema, {
          abortEarly: options.abortEarly,
          reporter: sourceHousingReporter
        })
      )
      .pipeTo(
        createSourceHousingProcessor({
          reporter: sourceHousingReporter,
          housingRepository: {
            findOne(localId: string): Promise<HousingApi | null> {
              const geoCode = localId.substring(0, 5);
              return housingRepository.findOne({
                localId,
                geoCode
              });
            },
            async insert(housing: HousingApi): Promise<void> {
              if (!options.dryRun) {
                await housingRepository.save(housing, {
                  onConflict: 'ignore'
                });
              }
            },
            async update(
              { geoCode, id }: Pick<HousingApi, 'geoCode' | 'id'>,
              housing: Partial<HousingApi>
            ): Promise<void> {
              if (!options.dryRun) {
                await Housing().where({ geo_code: geoCode, id }).update({
                  data_file_years: housing.dataFileYears,
                  occupancy: housing.occupancy
                });
              }
            }
          },
          housingEventRepository: {
            find: eventRepository.findHousingEvents
          }
        })
      );
    logger.info(`File ${file} imported.`);
    sourceHousingReporter.report();

    logger.info('Starting check for housings missing from the file...');
    const housingStream = Housing().stream();
    const housingCount = Number(await Housing().count().first());
    await Readable.toWeb(housingStream)
      .pipeThrough(
        progress({
          initial: 0,
          total: housingCount
        })
      )
      .pipeTo(
        createHousingProcessor({
          reporter: housingReporter,
          housingRepository: {
            async update(
              { geoCode, id }: Pick<HousingApi, 'geoCode' | 'id'>,
              housing: Partial<HousingApi>
            ): Promise<void> {
              if (!options.dryRun) {
                await Housing().where({ geo_code: geoCode, id }).update({
                  data_file_years: housing.dataFileYears,
                  occupancy: housing.occupancy
                });
              }
            }
          }
        })
      );
    logger.info('Check done.');
    housingReporter.report();
  };
}