import { WritableStream } from 'node:stream/web';
import { v4 as uuidv4 } from 'uuid';

import { AddressKinds } from '@zerologementvacant/models';
import { ReporterError, ReporterOptions } from '~/scripts/import-lovac/infra';
import { SourceHousing } from '~/scripts/import-lovac/source-housings/source-housing';
import { createLogger } from '~/infra/logger';
import {
  HousingApi,
  HousingId,
  isSupervised,
  normalizeDataFileYears,
  OccupancyKindApi,
  OwnershipKindsApi
} from '~/models/HousingApi';
import { HousingStatusApi } from '~/models/HousingStatusApi';
import { HousingEventApi } from '~/models/EventApi';
import { AddressApi } from '~/models/AddressApi';
import { UserApi } from '~/models/UserApi';
import { compact } from '~/utils/object';

const logger = createLogger('sourceHousingProcessor');

export interface ProcessorOptions extends ReporterOptions<SourceHousing> {
  auth: UserApi;
  banAddressRepository: {
    insert(address: AddressApi): Promise<void>;
  };
  housingEventRepository: {
    insert(event: HousingEventApi): Promise<void>;
    find(id: HousingId): Promise<ReadonlyArray<HousingEventApi>>;
  };
  housingRepository: {
    findOne(geoCode: string, localId: string): Promise<HousingApi | null>;
    insert(housing: HousingApi): Promise<void>;
    update(
      id: Pick<HousingApi, 'geoCode' | 'id'>,
      housing: Partial<HousingApi>
    ): Promise<void>;
  };
}

export function createSourceHousingProcessor(opts: ProcessorOptions) {
  const {
    abortEarly,
    auth,
    banAddressRepository,
    housingEventRepository,
    housingRepository,
    reporter
  } = opts;

  return new WritableStream<SourceHousing>({
    async write(chunk) {
      try {
        logger.debug('Processing source housing...', { chunk });

        const existingHousing = await housingRepository.findOne(
          chunk.geo_code,
          chunk.local_id
        );
        if (!existingHousing) {
          const housing: HousingApi = {
            id: uuidv4(),
            invariant: '',
            localId: chunk.local_id,
            buildingId: chunk.building_id,
            rawAddress: [chunk.dgfip_address],
            geoCode: chunk.geo_code,
            longitude: chunk.dgfip_longitude ?? undefined,
            latitude: chunk.dgfip_latitude ?? undefined,
            cadastralClassification:
              chunk.cadastral_classification ?? undefined,
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
          };
          await housingRepository.insert(housing);
          if (chunk.ban_address) {
            await banAddressRepository.insert({
              refId: housing.id,
              addressKind: AddressKinds.Housing,
              address: chunk.ban_address,
              postalCode: '',
              city: '',
              latitude: chunk.ban_latitude ?? undefined,
              longitude: chunk.ban_longitude ?? undefined,
              score: chunk.ban_score ?? undefined
            });
          }
          reporter.passed(chunk);
          return;
        }

        // The housing exists
        const existingEvents = await housingEventRepository.find({
          id: existingHousing.id,
          geoCode: existingHousing.geoCode
        });

        const dataFileYears = normalizeDataFileYears(
          existingHousing.dataFileYears.concat('lovac-2024')
        );
        let occupancy: OccupancyKindApi | undefined;
        let event: HousingEventApi | undefined;

        if (existingHousing.occupancy !== OccupancyKindApi.Vacant) {
          if (!isSupervised(existingHousing, existingEvents)) {
            occupancy = OccupancyKindApi.Vacant;
            event = {
              id: uuidv4(),
              name: 'Changement de statut d’occupation',
              kind: 'Update',
              category: 'Followup',
              section: 'Situation',
              conflict: false,
              old: existingHousing,
              new: { ...existingHousing, dataFileYears, occupancy },
              createdBy: auth.id,
              createdAt: new Date(),
              housingGeoCode: existingHousing.geoCode,
              housingId: existingHousing.id
            };
          }
        }

        await Promise.all([
          housingRepository.update(
            { id: existingHousing.id, geoCode: existingHousing.geoCode },
            compact({ dataFileYears, occupancy })
          ),
          event ? housingEventRepository.insert(event) : Promise.resolve()
        ]);
        reporter.passed(chunk);
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
