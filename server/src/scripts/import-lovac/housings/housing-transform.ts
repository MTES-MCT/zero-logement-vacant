import {
  DataFileYear,
  HOUSING_STATUS_LABELS,
  HousingStatus,
  Occupancy,
  OCCUPANCY_LABELS
} from '@zerologementvacant/models';
import { v4 as uuidv4 } from 'uuid';

import { createLogger } from '~/infra/logger';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
import { UserApi } from '~/models/UserApi';
import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';

const logger = createLogger('existingHousingTransform');

interface Change<Value, Type extends string> {
  type: Type;
  kind: 'create' | 'update';
  value: Value;
}

export type HousingUpdateChange = Change<HousingApi, 'housing'> & {
  kind: 'update';
};
export type HousingEventChange = Change<HousingEventApi, 'event'> & {
  kind: 'create';
};
export type ExistingHousingChange = HousingUpdateChange | HousingEventChange;

export interface ExistingHousingTransformOptions
  extends ReporterOptions<HousingApi> {
  auth: UserApi;
  year: DataFileYear;
}

export function createExistingHousingTransform(
  opts: ExistingHousingTransformOptions
) {
  const { abortEarly, auth, reporter, year } = opts;

  return function transform(housing: HousingApi): ExistingHousingChange[] {
    try {
      logger.debug('Processing existing housing...', { housing });

      if (housing.dataFileYears.includes(year)) {
        reporter.skipped(housing);
        return [];
      }

      if (housing.occupancy !== Occupancy.VACANT) {
        reporter.skipped(housing);
        return [];
      }

      if (isInProgress(housing) || isCompleted(housing)) {
        reporter.skipped(housing);
        return [];
      }

      const changes: ExistingHousingChange[] = [
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
            type: 'housing:occupancy-updated',
            nextOld: { occupancy: OCCUPANCY_LABELS[housing.occupancy] },
            nextNew: { occupancy: OCCUPANCY_LABELS[Occupancy.UNKNOWN] },
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
            type: 'housing:status-updated',
            nextOld: {
              status: HOUSING_STATUS_LABELS[housing.status],
              subStatus: housing.subStatus
            },
            nextNew: {
              status: HOUSING_STATUS_LABELS[HousingStatus.COMPLETED],
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
  };
}

export function isInProgress(
  housing: Pick<HousingApi, 'status' | 'subStatus'>
): boolean {
  return (
    housing.status === HousingStatus.IN_PROGRESS &&
    !!housing.subStatus &&
    ['En accompagnement', 'Intervention publique'].includes(housing.subStatus)
  );
}

export function isCompleted(housing: Pick<HousingApi, 'status'>): boolean {
  return housing.status === HousingStatus.COMPLETED;
}
