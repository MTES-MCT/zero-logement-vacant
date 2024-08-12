import { count } from '@zerologementvacant/utils';
import { createLoggerReporter } from '~/scripts/import-lovac/infra';
import {
  SourceHousingOwner,
  sourceHousingOwnerSchema
} from '~/scripts/import-lovac/source-housing-owners/source-housing-owner';
import { createLogger } from '~/infra/logger';
import { createSourceHousingOwnerProcessor } from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-processor';
import userRepository from '~/repositories/userRepository';
import config from '~/infra/config';
import UserMissingError from '~/errors/userMissingError';
import { HousingApi } from '~/models/HousingApi';
import housingRepository from '~/repositories/housingRepository';
import { HousingEventApi } from '~/models/EventApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';
import createSourceHousingOwnerFileRepository from '~/scripts/import-lovac/source-housing-owners/source-housing-owner-file-repository';
import eventRepository from '~/repositories/eventRepository';
import housingOwnerRepository from '~/repositories/housingOwnerRepository';
import ownerRepository from '~/repositories/ownerRepository';
import { progress } from '~/scripts/import-lovac/infra/progress-bar';
import validator from '~/scripts/import-lovac/infra/validator';

const logger = createLogger('sourceHousingOwnerCommand');

export interface ExecOptions {
  abortEarly?: boolean;
  departments?: string[];
  dryRun?: boolean;
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
      await createSourceHousingOwnerFileRepository(file)
        .stream({
          departments: options.departments
        })
        .pipeThrough(
          progress({
            initial: 0,
            total
          })
        )
        .pipeThrough(
          validator(sourceHousingOwnerSchema, {
            abortEarly: options.abortEarly,
            reporter
          })
        )
        .pipeTo(
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
            housingEventRepository: {
              async insert(event: HousingEventApi): Promise<void> {
                if (!options.dryRun) {
                  await eventRepository.insertHousingEvent(event);
                }
              }
            },
            housingOwnerRepository: {
              async insert(housingOwner: HousingOwnerApi): Promise<void> {
                if (!options.dryRun) {
                  await housingOwnerRepository.saveMany([housingOwner]);
                }
              },
              async saveMany(
                housingOwners: ReadonlyArray<HousingOwnerApi>
              ): Promise<void> {
                if (!options.dryRun) {
                  await housingOwnerRepository.saveMany(
                    housingOwners as HousingOwnerApi[]
                  );
                }
              }
            },
            ownerRepository: {
              async findOne(idpersonne: string): Promise<OwnerApi | null> {
                return ownerRepository.findOne({ idpersonne });
              },
              async findByHousing(
                housing: HousingApi
              ): Promise<ReadonlyArray<HousingOwnerApi>> {
                return ownerRepository.findByHousing(housing);
              }
            },
            reporter
          })
        );
      logger.info(`File ${file} imported.`);
    } catch (error) {
      logger.error(error);
      throw error;
    } finally {
      reporter.report();
    }
  };
}
