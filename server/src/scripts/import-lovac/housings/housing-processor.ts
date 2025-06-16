import {
  HousingStatus,
  Occupancy,
  toEventHousingStatus
} from '@zerologementvacant/models';
import { map } from '@zerologementvacant/utils/node';
import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '~/infra/logger';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
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
export type HousingChanges = HousingChange | HousingEventChange;

export function createHousingProcessor(opts: ProcessorOptions) {
  const { abortEarly, auth, reporter } = opts;

  return map<HousingApi, ReadonlyArray<HousingChanges>>((housing) => {
    try {
      logger.debug('Processing housing...', { housing });

      if (!housing.dataFileYears.includes('lovac-2025')) {
        if (housing.occupancy === Occupancy.VACANT) {
          if (!isInProgress(housing) && !isCompleted(housing)) {
            const changes: ReadonlyArray<HousingChanges> = [
              {
                type: 'housing',
                kind: 'update',
                value: {
                  ...housing,
                  occupancy: Occupancy.UNKNOWN,
                  status: HousingStatus.COMPLETED,
                  subStatus: 'Sortie de la vacance'
                }
              },
              {
                type: 'event',
                kind: 'create',
                value: {
                  id: uuidv4(),
                  name: 'Changement de statut d’occupation',
                  type: 'housing:occupancy-updated',
                  // Retain only the interesting values
                  nextOld: { occupancy: housing.occupancy },
                  nextNew: { occupancy: Occupancy.UNKNOWN },
                  createdAt: new Date().toJSON(),
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
                  type: 'housing:status-updated',
                  // Retain only the interesting values
                  nextOld: {
                    status: toEventHousingStatus(housing.status),
                    subStatus: housing.subStatus
                  },
                  nextNew: {
                    status: 'completed',
                    subStatus: 'Sortie de la vacance'
                  },
                  createdAt: new Date().toJSON(),
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
    housing.status === HousingStatus.IN_PROGRESS &&
    !!housing.subStatus &&
    ['En accompagnement', 'Intervention publique'].includes(housing.subStatus)
  );
}

export function isCompleted(housing: HousingApi): boolean {
  return housing.status === HousingStatus.COMPLETED;
}
