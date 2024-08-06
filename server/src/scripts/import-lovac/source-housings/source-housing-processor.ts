import { WritableStream } from 'node:stream/web';
import { v4 as uuidv4 } from 'uuid';

import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';
import { createLogger } from '~/infra/logger';
import {
  HousingApi,
  isSupervised,
  OccupancyKindApi,
  OwnershipKindsApi
} from '~/models/HousingApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { EventApi } from '~/models/EventApi';

const logger = createLogger('sourceHousingProcessor');

export interface ProcessorOptions extends ReporterOptions<SourceHousing> {
  housingEventRepository: {
    find(housingId: string): Promise<ReadonlyArray<EventApi<HousingApi>>>;
  };
  housingRepository: {
    findOne(localId: string): Promise<HousingApi | null>;
    insert(housing: HousingApi): Promise<void>;
    update(
      id: Pick<HousingApi, 'geoCode' | 'id'>,
      housing: Partial<HousingApi>
    ): Promise<void>;
  };
}

export function createSourceHousingProcessor(opts: ProcessorOptions) {
  const { abortEarly, housingEventRepository, housingRepository, reporter } =
    opts;

  return new WritableStream<SourceHousing>({
    async write(chunk) {
      try {
        logger.debug('Processing source housing...', { chunk });

        const existingHousing = await housingRepository.findOne(chunk.local_id);
        if (!existingHousing) {
          await housingRepository.insert({
            id: uuidv4(),
            invariant: '',
            localId: chunk.local_id,
            buildingId: chunk.building_id,
            rawAddress: [chunk.dgfip_address],
            geoCode: chunk.geo_code,
            longitude: chunk.dgfip_longitude,
            latitude: chunk.dgfip_latitude,
            cadastralClassification: chunk.cadastral_classification,
            uncomfortable: chunk.uncomfortable,
            vacancyStartYear: chunk.vacancy_start_year,
            housingKind: chunk.housing_kind,
            roomsCount: chunk.rooms_count,
            livingArea: chunk.living_area,
            buildingYear: chunk.building_year ?? undefined,
            mutationDate: chunk.mutation_date,
            taxed: chunk.taxed,
            vacancyReasons: undefined,
            dataYears: [2023],
            dataFileYears: ['lovac-2024'],
            beneficiaryCount: chunk.beneficiary_count,
            buildingLocation: chunk.location_detail,
            ownershipKind: chunk.condominium as OwnershipKindsApi,
            status: HousingStatusApi.NeverContacted,
            occupancy: OccupancyKindApi.Vacant,
            occupancyRegistered: OccupancyKindApi.Vacant,
            source: 'lovac'
          });
          // TODO: create events
        }

        if (existingHousing) {
          const existingEvents = await housingEventRepository.find(
            existingHousing.id
          );

          if (existingHousing.occupancy !== OccupancyKindApi.Vacant) {
            if (!isSupervised(existingHousing, existingEvents)) {
              await housingRepository.update(
                { id: existingHousing.id, geoCode: existingHousing.geoCode },
                {
                  dataFileYears: [
                    ...existingHousing.dataFileYears,
                    'lovac-2024'
                  ],
                  occupancy: OccupancyKindApi.Vacant
                }
              );
              // TODO: create events

              reporter.passed(chunk);
              return;
            } else {
              await housingRepository.update(
                { id: existingHousing.id, geoCode: existingHousing.geoCode },
                {
                  dataFileYears: [
                    ...existingHousing.dataFileYears,
                    'lovac-2024'
                  ]
                }
              );
              reporter.passed(chunk);
              return;
            }
          }

          if (existingHousing.occupancy === OccupancyKindApi.Vacant) {
            await housingRepository.update(
              { id: existingHousing.id, geoCode: existingHousing.geoCode },
              {
                dataFileYears: [...existingHousing.dataFileYears, 'lovac-2024']
              }
            );
            // TODO: create events

            reporter.passed(chunk);
            return;
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
