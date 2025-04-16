import { Occupancy } from '@zerologementvacant/models';
import { map } from '@zerologementvacant/utils/node';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '~/infra/logger';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { UserApi } from '~/models/UserApi';
import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';

const logger = createLogger('housingProcessor');

export interface ProcessorOptions extends ReporterOptions<HousingApi> {
  auth: UserApi;
}

interface Change<Value, Type extends string> {
  type: Type;
  kind: 'create' | 'update' | 'delete';
  value: Value;
}

export type HousingChange = Change<HousingApi, 'housing'>;
export type HousingEventChange = Change<HousingEventApi, 'event'>;
export type Changes = HousingChange | HousingEventChange;

export function createHousingProcessor(opts: ProcessorOptions) {
  const { abortEarly, auth, reporter } = opts;

  return map<HousingApi, ReadonlyArray<Changes>>(async (housing) => {
    try {
      logger.debug('Processing housing...', { housing });

      if (!housing.dataFileYears.includes('lovac-2025')) {
        if (housing.occupancy === Occupancy.VACANT) {
          if (!isInProgress(housing) && !isCompleted(housing)) {
            const changes: ReadonlyArray<Changes> = [
              {
                type: 'housing',
                kind: 'update',
                value: {
                  ...housing,
                  occupancy: Occupancy.UNKNOWN,
                  status: HousingStatusApi.Completed,
                  subStatus: 'Sortie de la vacance'
                }
              },
              {
                type: 'event',
                kind: 'create',
                value: {
                  id: uuidv4(),
                  name: 'Changement de statut d’occupation',
                  kind: 'Update',
                  category: 'Followup',
                  section: 'Situation',
                  conflict: false,
                  // Retain only the interesting values
                  old: { occupancy: housing.occupancy } as HousingApi,
                  new: { occupancy: Occupancy.UNKNOWN } as HousingApi,
                  createdAt: new Date(),
                  createdBy: auth.id,
                  housingId: housing.id,
                  housingGeoCode: housing.geoCode
                }
              },
              {
                type: 'event',
                kind: 'create',
                value: {
                  id: uuidv4(),
                  name: 'Changement de statut de suivi',
                  kind: 'Update',
                  category: 'Followup',
                  section: 'Situation',
                  conflict: false,
                  // Retain only the interesting values
                  old: {
                    status: housing.status,
                    subStatus: housing.subStatus
                  } as HousingApi,
                  new: {
                    status: HousingStatusApi.Completed,
                    subStatus: 'Sortie de la vacance'
                  } as HousingApi,
                  createdAt: new Date(),
                  createdBy: auth.id,
                  housingId: housing.id,
                  housingGeoCode: housing.geoCode
                }
              }
            ];
            reporter.passed(housing);
            return changes;
          }
        }
      }

      reporter.skipped(housing);
      return [];
    } catch (error) {
      reporter.failed(
        housing,
        new ReporterError((error as Error).message, housing)
      );

      if (abortEarly) {
        throw error;
      }

      return [];
    }
  });
}

export function isInProgress(housing: HousingApi): boolean {
  return (
    housing.status === HousingStatusApi.InProgress &&
    !!housing.subStatus &&
    ['En accompagnement', 'Intervention publique'].includes(housing.subStatus)
  );
}

export function isCompleted(housing: HousingApi): boolean {
  return housing.status === HousingStatusApi.Completed;
}
