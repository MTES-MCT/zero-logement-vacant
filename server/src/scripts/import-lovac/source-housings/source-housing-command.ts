import { count } from '@zerologementvacant/utils/node';
import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import { AddressApi } from '~/models/AddressApi';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi, HousingId } from '~/models/HousingApi';
import { HousingNoteApi } from '~/models/NoteApi';
import banAddressesRepository from '~/repositories/banAddressesRepository';
import eventRepository from '~/repositories/eventRepository';
import housingRepository, {
  Housing,
  HousingRecordDBO
} from '~/repositories/housingRepository';
import noteRepository from '~/repositories/noteRepository';
import userRepository from '~/repositories/userRepository';
import { createHousingProcessor } from '~/scripts/import-lovac/housings/housing-processor';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceHousing,
  sourceHousingSchema
} from '~/scripts/import-lovac/source-housings/source-housing';
import createSourceHousingFileRepository from '~/scripts/import-lovac/source-housings/source-housing-file-repository';
import { createSourceHousingProcessor } from '~/scripts/import-lovac/source-housings/source-housing-processor';
import { compactUndefined } from '~/utils/object';

const logger = createLogger('sourceHousingCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
}

export function createSourceHousingCommand() {
  const sourceHousingReporter = createLoggerReporter<SourceHousing>();
  const housingReporter = createLoggerReporter<HousingApi>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      logger.debug('Starting source housing command...', { file, options });

      const auth = await userRepository.getByEmail(config.app.system);
      if (!auth) {
        throw new UserMissingError(config.app.system);
      }

      const departments = options.departments ?? [];

      logger.info('Computing total...');
      const total = await count(
        createSourceHousingFileRepository(file).stream({ departments })
      );

      logger.info('Starting import...', { file });
      await createSourceHousingFileRepository(file)
        .stream({ departments })
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
            abortEarly: options.abortEarly,
            auth,
            reporter: sourceHousingReporter,
            banAddressRepository: {
              async insert(address: AddressApi): Promise<void> {
                if (!options.dryRun) {
                  await banAddressesRepository.save(address);
                }
              }
            },
            housingRepository: {
              findOne(
                geoCode: string,
                localId: string
              ): Promise<HousingApi | null> {
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
                  await Housing()
                    .where({ geo_code: geoCode, id })
                    .update(
                      compactUndefined<Partial<HousingRecordDBO>>({
                        data_file_years: housing.dataFileYears,
                        occupancy: housing.occupancy,
                        status: housing.status,
                        sub_status: housing.subStatus,
                        // Other properties
                        building_id: housing.buildingId,
                        building_location: housing.buildingLocation,
                        building_year: housing.buildingYear,
                        plot_id: housing.plotId,
                        address_dgfip: housing.rawAddress,
                        latitude_dgfip: housing.latitude,
                        longitude_dgfip: housing.longitude,
                        housing_kind: housing.housingKind,
                        condominium: housing.ownershipKind,
                        living_area: housing.livingArea,
                        rooms_count: housing.roomsCount,
                        uncomfortable: housing.uncomfortable,
                        cadastral_classification:
                          housing.cadastralClassification,
                        taxed: housing.taxed,
                        rental_value: housing.rentalValue,
                        occupancy_source: housing.occupancyRegistered,
                        vacancy_start_year: housing.vacancyStartYear,
                        mutation_date: housing.mutationDate ?? undefined
                      })
                    );
                }
              }
            },
            housingEventRepository: {
              async find({
                id,
                geoCode
              }: HousingId): Promise<ReadonlyArray<HousingEventApi>> {
                const events = await eventRepository.findHousingEvents(id);
                return events.map((event) => ({
                  ...event,
                  housingId: id,
                  housingGeoCode: geoCode
                }));
              },
              async insertMany(events: HousingEventApi[]): Promise<void> {
                if (!options.dryRun) {
                  await eventRepository.insertManyHousingEvents(events);
                }
              }
            },
            housingNoteRepository: {
              async find({
                id,
                geoCode
              }: HousingId): Promise<ReadonlyArray<HousingNoteApi>> {
                const notes = await noteRepository.findHousingNotes(id);
                return notes.map((note) => ({
                  ...note,
                  housingId: id,
                  housingGeoCode: geoCode
                }));
              }
            }
          })
        );
      logger.info(`File ${file} imported.`);
      sourceHousingReporter.report();

      logger.info('Starting check for housings missing from the file...');
      const housingStream = housingRepository.betterStream();
      const housingCount = Number((await Housing().count().first())?.count);
      await housingStream
        .pipeThrough(
          progress({
            initial: 0,
            total: housingCount
          })
        )
        .pipeTo(
          createHousingProcessor({
            auth,
            abortEarly: options.abortEarly,
            reporter: housingReporter,
            housingRepository: {
              async update({ geoCode, id }, housing): Promise<void> {
                if (!options.dryRun) {
                  await Housing().where({ geo_code: geoCode, id }).update({
                    status: housing.status,
                    sub_status: housing.subStatus,
                    occupancy: housing.occupancy
                  });
                }
              }
            },
            housingEventRepository: {
              async insert(event: HousingEventApi): Promise<void> {
                if (!options.dryRun) {
                  await eventRepository.insertHousingEvent(event);
                }
              }
            }
          })
        );
      logger.info('Check done.');
      housingReporter.report();
    } catch (error) {
      logger.error(error);
      throw error;
    } finally {
      sourceHousingReporter.report();
      housingReporter.report();
    }
  };
}
