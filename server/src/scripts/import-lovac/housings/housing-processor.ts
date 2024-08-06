import { WritableStream } from 'node:stream/web';

import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';
import { HousingRecordDBO } from '~/repositories/housingRepository';
import { createLogger } from '~/infra/logger';
import { HousingApi, OccupancyKindApi } from '~/models/HousingApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';

const logger = createLogger('housingProcessor');

export interface ProcessorOptions extends ReporterOptions<HousingRecordDBO> {
  housingRepository: {
    update(
      id: Pick<HousingApi, 'geoCode' | 'id'>,
      housing: Partial<HousingApi>
    ): Promise<void>;
  };
}

export function createHousingProcessor(opts: ProcessorOptions) {
  const { housingRepository, reporter } = opts;

  return new WritableStream<HousingRecordDBO>({
    async write(chunk) {
      try {
        logger.debug('Processing housing...', { chunk });

        if (!chunk.data_file_years.includes('lovac-2024')) {
          if (chunk.occupancy === OccupancyKindApi.Vacant) {
            if (!isInProgress(chunk) && !isCompleted(chunk)) {
              await housingRepository.update(
                { geoCode: chunk.geo_code, id: chunk.id },
                {
                  occupancy: OccupancyKindApi.Unknown,
                  status: HousingStatusApi.Completed,
                  subStatus: 'Sortie de la vacance'
                }
              );
              // TODO: create events

              reporter.passed(chunk);
              return;
            }
          }

          // TODO: last case
        }
      } catch (error) {
        // TODO: implement abortEarly
        reporter.failed(
          chunk,
          new ReporterError((error as Error).message, chunk)
        );
      }
    }
  });
}

export function isInProgress(chunk: HousingRecordDBO): boolean {
  return (
    chunk.status === HousingStatusApi.InProgress &&
    !!chunk.sub_status &&
    ['En accompagnement', 'Intervention publique'].includes(chunk.sub_status)
  );
}

export function isCompleted(chunk: HousingRecordDBO): boolean {
  return chunk.status === HousingStatusApi.Completed;
}
