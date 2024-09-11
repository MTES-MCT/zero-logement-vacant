import { count } from '@zerologementvacant/utils';
import createSourceHousingFileRepository from '~/scripts/import-lovac/source-housings/source-housing-file-repository';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceHousing,
  sourceHousingSchema
} from '~/scripts/import-lovac/source-housings/source-housing';
import { createSourceHousingProcessor } from '~/scripts/import-lovac/source-housings/source-housing-processor';
import { HousingApi, HousingId } from '~/models/HousingApi';
import housingRepository, { Housing } from '~/repositories/housingRepository';
import eventRepository from '~/repositories/eventRepository';
import { createLogger } from '~/infra/logger';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { createHousingProcessor } from '~/scripts/import-lovac/housings/housing-processor';
import { AddressApi } from '~/models/AddressApi';
import banAddressesRepository from '~/repositories/banAddressesRepository';
import { HousingEventApi } from '~/models/EventApi';
import userRepository from '~/repositories/userRepository';
import config from '~/infra/config';
import UserMissingError from '~/errors/userMissingError';
import { compactUndefined } from '~/utils/object';
import { HousingNoteApi } from '~/models/NoteApi';
import noteRepository from '~/repositories/noteRepository';

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
                      compactUndefined({
                        data_file_years: housing.dataFileYears,
                        occupancy: housing.occupancy,
                        status: housing.status,
                        sub_status: housing.subStatus
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
