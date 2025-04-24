import {
  chunkify,
  count,
  filter,
  flatten,
  groupBy,
  map
} from '@zerologementvacant/utils/node';
import { WritableStream } from 'node:stream/web';
import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import { createLogger } from '~/infra/logger';
import { HousingEventApi } from '~/models/EventApi';
import { HousingApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import eventRepository from '~/repositories/eventRepository';
import housingOwnerRepository from '~/repositories/housingOwnerRepository';
import housingRepository from '~/repositories/housingRepository';
import ownerRepository from '~/repositories/ownerRepository';
import userRepository from '~/repositories/userRepository';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import { FromOptionValue } from '~/scripts/import-lovac/infra/options/from';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/infra/validator';
import {
  SourceHousingOwner,
  sourceHousingOwnerSchema
} from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import createSourceHousingOwnerFileRepository from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-file-repository';
import {
  createSourceHousingOwnerProcessor,
  HousingEventChange,
  HousingOwnersChange
} from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-processor';

const logger = createLogger('sourceHousingOwnerCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
  from: FromOptionValue;
}

export function createSourceHousingOwnerCommand() {
  const reporter = createLoggerReporter<SourceHousingOwner>();

  return async (file: string, options: ExecOptions): Promise<void> => {
    try {
      logger.debug('Starting source housing owner command...', {
        file,
        options
      });

      const auth = await userRepository.getByEmail(config.app.system);
      if (!auth) {
        throw new UserMissingError(config.app.system);
      }

      logger.info('Computing total...');
      const total = await count(
        createSourceHousingOwnerFileRepository(file).stream({
          departments: options.departments
        })
      );

      logger.info('Starting import...', { file });
      const [housingOwnerStream, eventStream] =
        createSourceHousingOwnerFileRepository(file)
          .stream({
            departments: options.departments
          })
          .pipeThrough(
            progress({
              initial: 0,
              total,
              name: '(1/1) Updating housing owners'
            })
          )
          .pipeThrough(
            validator(sourceHousingOwnerSchema, {
              abortEarly: options.abortEarly,
              reporter
            })
          )
          .pipeThrough(groupBy((a, b) => a.local_id === b.local_id))
          .pipeThrough(
            createSourceHousingOwnerProcessor({
              abortEarly: options.abortEarly,
              auth,
              housingRepository: {
                async findOne(geoCode, localId): Promise<HousingApi | null> {
                  return housingRepository.findOne({
                    localId,
                    geoCode
                  });
                }
              },
              ownerRepository: {
                async find(
                  idpersonnes: string[]
                ): Promise<ReadonlyArray<OwnerApi>> {
                  return ownerRepository.find({
                    filters: { idpersonne: idpersonnes }
                  });
                },
                async findByHousing(
                  housing: HousingApi
                ): Promise<ReadonlyArray<HousingOwnerApi>> {
                  return ownerRepository.findByHousing(housing);
                }
              },
              reporter
            })
          )
          .pipeThrough(flatten())
          .tee();

      await Promise.all([
        // Update housing owners
        housingOwnerStream
          .pipeThrough(
            filter(
              (change): change is HousingOwnersChange =>
                change.type === 'housingOwners' && change.kind === 'replace'
            )
          )
          .pipeThrough(map((change) => change.value))
          .pipeTo(
            new WritableStream<HousingOwnerApi[]>({
              async write(housingOwners) {
                if (!options.dryRun) {
                  await housingOwnerRepository.saveMany(housingOwners);
                }
              }
            })
          ),
        // Save events
        eventStream
          .pipeThrough(
            filter(
              (change): change is HousingEventChange =>
                change.type === 'event' && change.kind === 'create'
            )
          )
          .pipeThrough(map((change) => change.value))
          .pipeThrough(chunkify({ size: 1_000 }))
          .pipeTo(
            new WritableStream<HousingEventApi[]>({
              async write(events) {
                if (!options.dryRun) {
                  await eventRepository.insertManyHousingEvents(events);
                }
              }
            })
          )
      ]);

      logger.info(`File ${file} imported.`);
    } catch (error) {
      logger.error(error);
      throw error;
    } finally {
      reporter.report();
    }
  };
}
