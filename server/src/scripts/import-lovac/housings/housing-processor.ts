import { WritableStream } from 'node:stream/web';
import { v4 as uuidv4 } from 'uuid';

import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';
import { createLogger } from '~/infra/logger';
import { HousingApi, OccupancyKindApi } from '~/models/HousingApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { HousingEventApi } from '~/models/EventApi';
import { UserApi } from '~/models/UserApi';

const logger = createLogger('housingProcessor');

export interface ProcessorOptions extends ReporterOptions<HousingApi> {
  auth: UserApi;
  housingRepository: {
    update(
      id: Pick<HousingApi, 'geoCode' | 'id'>,
      housing: Partial<HousingApi>
    ): Promise<void>;
  };
  housingEventRepository: {
    insert(event: HousingEventApi): Promise<void>;
  };
}

export function createHousingProcessor(opts: ProcessorOptions) {
  const {
    abortEarly,
    auth,
    housingRepository,
    housingEventRepository,
    reporter
  } = opts;

  return new WritableStream<HousingApi>({
    async write(chunk) {
      try {
        logger.debug('Processing housing...', { chunk });

        if (!chunk.dataFileYears.includes('lovac-2024')) {
          if (chunk.occupancy === OccupancyKindApi.Vacant) {
            if (!isInProgress(chunk) && !isCompleted(chunk)) {
              await housingRepository.update(
                { geoCode: chunk.geoCode, id: chunk.id },
                {
                  occupancy: OccupancyKindApi.Unknown,
                  status: HousingStatusApi.Completed,
                  subStatus: 'Sortie de la vacance'
                }
              );
              await housingEventRepository.insert({
                id: uuidv4(),
                name: 'Changement de statut d’occupation',
                kind: 'Update',
                category: 'Followup',
                section: 'Situation',
                conflict: false,
                old: chunk,
                new: { ...chunk, occupancy: OccupancyKindApi.Unknown },
                createdAt: new Date(),
                createdBy: auth.id,
                housingId: chunk.id,
                housingGeoCode: chunk.geoCode
              });
              await housingEventRepository.insert({
                id: uuidv4(),
                name: 'Changement de statut de suivi',
                kind: 'Update',
                category: 'Followup',
                section: 'Situation',
                conflict: false,
                old: chunk,
                new: {
                  ...chunk,
                  status: HousingStatusApi.Completed,
                  subStatus: 'Sortie de la vacance'
                },
                createdAt: new Date(),
                createdBy: auth.id,
                housingId: chunk.id,
                housingGeoCode: chunk.geoCode
              });

              reporter.passed(chunk);
              return;
            }
          }
        }

        reporter.skipped(chunk);
      } catch (error) {
        reporter.failed(
          chunk,
          new ReporterError((error as Error).message, chunk)
        );

        if (abortEarly) {
          throw error;
        }
      }
    }
  });
}

export function isInProgress(chunk: HousingApi): boolean {
  return (
    chunk.status === HousingStatusApi.InProgress &&
    !!chunk.subStatus &&
    ['En accompagnement', 'Intervention publique'].includes(chunk.subStatus)
  );
}

export function isCompleted(chunk: HousingApi): boolean {
  return chunk.status === HousingStatusApi.Completed;
}
