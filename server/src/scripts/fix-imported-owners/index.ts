import { isActiveOwnerRank, isInactiveOwnerRank, type OwnerRank } from '@zerologementvacant/models';
import { Array, pipe } from 'effect';
import { stringify as toJSONL } from 'jsonlines';
import { v4 as uuid } from 'uuid';

import { createWriteStream } from 'node:fs';
import path from 'node:path';
import { Transform, Writable } from 'node:stream';
import { filter, map } from 'web-streams-utils';
import OwnerMissingError from '~/errors/ownerMissingError';
import UserMissingError from '~/errors/userMissingError';
import config from '~/infra/config';
import db from '~/infra/database';
import { createLogger } from '~/infra/logger';
import {
  isUserModified,
  type EventUnion,
  type HousingOwnerEventApi
} from '~/models/EventApi';
import {
  HOUSING_OWNER_EQUIVALENCE,
  listAddedHousingOwners,
  listRemovedHousingOwners,
  listUpdatedHousingOwners,
  type HousingOwnerApi
} from '~/models/HousingOwnerApi';
import eventRepository from '~/repositories/eventRepository';
import {
  HousingOwners,
  housingOwnersTable
} from '~/repositories/housingOwnerRepository';
import { housingTable } from '~/repositories/housingRepository';
import ownerRepository, {
  ownerTable,
  parseHousingOwnerApi
} from '~/repositories/ownerRepository';
import userRepository from '~/repositories/userRepository';
import { createLoggerReporter } from '../import-lovac/infra';
import { progress } from '../import-lovac/infra/progress-bar';
import { createGenericSourceRepository } from './generic-source-repository';
import type { SourceHousingOwner } from './source-housing-owner';
import { createSourceHousingOwnerRepository } from './source-housing-owner-repository';

const logger = createLogger('fix-imported-owners');

interface RunOptions {
  /**
   * The email of the admin user that will be set as the creator of the events
   */
  email: string;
  files: {
    input: string;
    conflicts: string;
    output: string;
  };
  from: 'file' | 's3';
}

type PreprocessOptions = Pick<RunOptions, 'from'> & {
  files: {
    input: string;
    missingHousings: string;
    missingOwners: string;
    output: string;
  };
};

interface PreprocessedHousingOwner {
  housingGeoCode: string;
  housingId: string;
  ownerId: string;
}

const reporter = createLoggerReporter();

/**
 * Preprocess the source data to ensure that:
 * - The source owner is not already the main owner of the housing
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function preprocess(options: PreprocessOptions) {
  const sourceStream = createSourceHousingOwnerRepository({
    ...config.s3,
    file: options.files.input,
    from: options.from
  }).stream();

  const missingHousingFile = Writable.toWeb(
    createWriteStream(options.files.missingHousings)
  ).getWriter();
  const missingHousingStream = new WritableStream<
    SourceHousingOwner['local_id']
  >({
    async write(localId) {
      missingHousingFile.write(JSON.stringify(localId) + '\n');
    }
  }).getWriter();

  const missingOwnerFile = Writable.toWeb(
    createWriteStream(options.files.missingOwners)
  ).getWriter();
  const missingOwnerStream = new WritableStream<
    SourceHousingOwner['owner_idpersonne']
  >({
    async write(idpersonne) {
      missingOwnerFile.write(JSON.stringify(idpersonne) + '\n');
    }
  }).getWriter();

  await sourceStream
    .pipeThrough(
      progress({
        name: 'Preprocessing housing owners',
        initial: 0,
        total: 140546
      })
    )
    .pipeThrough(
      map(
        async (
          sourceHousingOwner
        ): Promise<PreprocessedHousingOwner | null> => {
          logger.debug('Preprocessing...', { sourceHousingOwner });

          const department = sourceHousingOwner.local_id
            .substring(0, 2)
            .toLowerCase();
          const departmentalHousingTable = `${housingTable}_${department}`;

          const [housing, owner] = await Promise.all([
            db(departmentalHousingTable)
              .where({ local_id: sourceHousingOwner.local_id })
              .select('id', 'geo_code')
              .first(),
            ownerRepository.findOne({
              idpersonne: sourceHousingOwner.owner_idpersonne
            })
          ]);
          if (!housing) {
            await missingHousingStream.write(sourceHousingOwner.local_id);
            return null;
          }
          if (!owner) {
            await missingOwnerStream.write(sourceHousingOwner.owner_idpersonne);
            return null;
          }

          return {
            housingGeoCode: housing.geo_code,
            housingId: housing.id,
            ownerId: owner.id
          };
        }
      )
    )
    .pipeThrough(filter((owner) => owner !== null))
    .pipeThrough(Transform.toWeb(toJSONL()))
    .pipeTo(Writable.toWeb(createWriteStream(options.files.output)));

  // Clean up
  await missingOwnerStream.close();
}

type Conflict = PreprocessedHousingOwner & {
  event: EventUnion<
    | 'housing:owner-attached'
    | 'housing:owner-updated'
    | 'housing:owner-detached'
  >;
};

interface Output {
  preprocessedHousingOwner: PreprocessedHousingOwner;
  housingOwners: {
    before: ReadonlyArray<ReturnType<typeof formatHousingOwner>>;
    after: ReadonlyArray<ReturnType<typeof formatHousingOwner>>;
  };
  events: ReadonlyArray<
    EventUnion<
      | 'housing:owner-attached'
      | 'housing:owner-updated'
      | 'housing:owner-detached'
    >
  >;
}

async function run(options: RunOptions) {
  const admin = await userRepository.getByEmail(options.email);
  if (!admin) {
    throw new UserMissingError(options.email);
  }

  const sourceStream = createGenericSourceRepository<PreprocessedHousingOwner>({
    ...config.s3,
    file: options.files.input,
    from: options.from
  }).stream();

  const conflictFile = Writable.toWeb(
    createWriteStream(options.files.conflicts)
  ).getWriter();
  const conflictWriter = new WritableStream<Conflict>({
    async write(conflict) {
      logger.debug('Writing conflict...', conflict);
      await conflictFile.write(JSON.stringify(conflict) + '\n');
    }
  }).getWriter();

  const resultFile = Writable.toWeb(
    createWriteStream(options.files.output)
  ).getWriter();
  const resultWriter = new WritableStream<Output>({
    async write(chunk) {
      logger.debug('Writing result...', chunk);
      await resultFile.write(JSON.stringify(chunk) + '\n');
    }
  }).getWriter();

  await sourceStream
    .pipeThrough(
      progress({
        name: 'Fixing housing owners...',
        initial: 0,
        total: 136593
      })
    )
    .pipeTo(
      new WritableStream<PreprocessedHousingOwner>({
        async write(chunk) {
          logger.debug('Processing...', chunk);

          const owner = await ownerRepository.get(chunk.ownerId);
          if (!owner) {
            logger.warn('Owner not found', { owner: chunk.ownerId });
            reporter.skipped(chunk);
            return;
          }

          const existingHousingOwners: ReadonlyArray<HousingOwnerApi> =
            await HousingOwners()
              .select(`${housingOwnersTable}.*`)
              .select(`${ownerTable}.*`)
              .join(
                ownerTable,
                `${ownerTable}.id`,
                `${housingOwnersTable}.owner_id`
              )
              .where({
                housing_geo_code: chunk.housingGeoCode,
                housing_id: chunk.housingId
              })
              .then(Array.map(parseHousingOwnerApi));

          // The owner is already the main owner of the housing
          if (isAlreadyMainOwner(chunk, existingHousingOwners)) {
            logger.debug('Owner is already the main owner', {
              sourceHousingOwner: chunk
            });
            reporter.skipped(chunk);
            return;
          }

          const conflicts = await eventRepository.find({
            filters: {
              types: [
                'housing:owner-attached',
                'housing:owner-detached',
                'housing:owner-updated'
              ],
              housings: [
                {
                  geoCode: chunk.housingGeoCode,
                  id: chunk.housingId
                }
              ]
            }
          });
          // Should be the latest event because `eventRepository.find
          // returns events by `createdAt DESC`
          const firstConflict = conflicts.at(0);
          // Check whether the user was the last person to modify the housing owners
          // otherwise it was an modified by an admin
          if (firstConflict && isUserModified(firstConflict)) {
            logger.warn('Housing has user events. Skipping...', {
              ...chunk,
              conflict: firstConflict
            });
            await conflictWriter.write({
              ...chunk,
              event: firstConflict
            });
            reporter.skipped(chunk);
            return;
          }

          const existingInactiveHousingOwners = existingHousingOwners.filter(
            (housingOwner) => isInactiveOwnerRank(housingOwner.rank)
          );
          const existingActiveHousingOwners = existingHousingOwners.filter(
            (housingOwner) => isActiveOwnerRank(housingOwner.rank)
          );
          const housingOwners: ReadonlyArray<HousingOwnerApi> = pipe(
            existingActiveHousingOwners,
            Array.map(
              // Archive active owners
              (housingOwner): HousingOwnerApi => ({
                ...housingOwner,
                rank: 0,
                endDate: new Date(),
                updatedAt: new Date().toJSON()
              })
            ),
            // Add inactive owners back
            Array.appendAll(existingInactiveHousingOwners),
            (existingHousingOwners) =>
              Array.containsWith(HOUSING_OWNER_EQUIVALENCE)(
                existingHousingOwners,
                chunk
              )
                ? existingHousingOwners.map((housingOwner) =>
                    housingOwner.id === chunk.ownerId
                      ? // If the owner is already linked as inactive, reactivate them
                        {
                          ...housingOwner,
                          rank: 1,
                          endDate: null,
                          updatedAt: new Date().toJSON()
                        }
                      : housingOwner
                  )
                : // Otherwise add them as main owner
                  existingHousingOwners.concat({
                    ...owner,
                    housingGeoCode: chunk.housingGeoCode,
                    housingId: chunk.housingId,
                    ownerId: owner.id,
                    rank: 1 as OwnerRank,
                    startDate: new Date(),
                    endDate: null,
                    propertyRight: null
                  })
          );

          logger.debug('Updating housing owners', {
            ...chunk,
            owners: {
              before: existingHousingOwners.map(formatHousingOwner),
              after: housingOwners.map(formatHousingOwner)
            }
          });

          // Create housing owner events
          const added = listAddedHousingOwners(
            existingHousingOwners,
            housingOwners
          );
          const removed = listRemovedHousingOwners(
            existingHousingOwners,
            housingOwners
          );
          const updated = listUpdatedHousingOwners(
            existingHousingOwners,
            housingOwners
          );
          const events: ReadonlyArray<HousingOwnerEventApi> = [
            ...added.map<HousingOwnerEventApi>((housingOwner) => {
              return {
                id: uuid(),
                name: 'Propriétaire ajouté au logement',
                type: 'housing:owner-attached',
                nextOld: null,
                nextNew: {
                  name: housingOwner.fullName,
                  rank: housingOwner.rank
                },
                createdAt: new Date().toJSON(),
                createdBy: admin.id,
                ownerId: housingOwner.ownerId,
                housingGeoCode: housingOwner.housingGeoCode,
                housingId: housingOwner.housingId
              };
            }),
            ...removed.map<HousingOwnerEventApi>((housingOwner) => {
              return {
                id: uuid(),
                name: 'Propriétaire retiré du logement',
                type: 'housing:owner-detached',
                nextOld: {
                  name: housingOwner.fullName,
                  rank: housingOwner.rank
                },
                nextNew: null,
                createdAt: new Date().toJSON(),
                createdBy: admin.id,
                ownerId: housingOwner.ownerId,
                housingGeoCode: housingOwner.housingGeoCode,
                housingId: housingOwner.housingId
              };
            }),
            ...updated.map<HousingOwnerEventApi>((housingOwner) => {
              const newHousingOwner = housingOwners.find(
                (ho) => ho.ownerId === housingOwner.ownerId
              );
              if (!newHousingOwner) {
                throw new OwnerMissingError(housingOwner.ownerId);
              }

              return {
                id: uuid(),
                name: 'Propriétaire mis à jour',
                type: 'housing:owner-updated',
                nextOld: {
                  name: housingOwner.fullName,
                  rank: housingOwner.rank
                },
                nextNew: {
                  name: newHousingOwner.fullName,
                  rank: newHousingOwner.rank
                },
                createdAt: new Date().toJSON(),
                createdBy: admin.id,
                ownerId: housingOwner.ownerId,
                housingGeoCode: housingOwner.housingGeoCode,
                housingId: housingOwner.housingId
              };
            })
          ];

          // await startTransaction(async () => {
          //   await Promise.all([
          //     housingOwnerRepository.saveMany(housingOwners as HousingOwnerApi[]),
          //     eventRepository.insertManyHousingOwnerEvents(events)
          //   ]);
          // });

          await resultWriter.write({
            preprocessedHousingOwner: chunk,
            housingOwners: {
              before: existingHousingOwners.map(formatHousingOwner),
              after: housingOwners.map(formatHousingOwner)
            },
            events
          });

          reporter.passed(chunk);
        }
      })
    );

  reporter.report();
}

function isAlreadyMainOwner(
  sourceHousingOwner: PreprocessedHousingOwner,
  existingHousingOwners: ReadonlyArray<HousingOwnerApi>
): boolean {
  return existingHousingOwners.some(
    (housingOwner) =>
      housingOwner.id === sourceHousingOwner.ownerId && housingOwner.rank === 1
  );
}

function formatHousingOwner(housingOwner: HousingOwnerApi) {
  return {
    id: housingOwner.id,
    idpersonne: housingOwner.idpersonne,
    rank: housingOwner.rank,
    name: housingOwner.fullName
  };
}

process.on('SIGINT', () => {
  reporter.report();
  process.exit();
});

// preprocess({
//   from: 'file',
//   files: {
//     input: path.resolve(
//       import.meta.dirname,
//       'fixed-distinct-same-dept-owners-2.jsonl'
//     ),
//     output: path.resolve(
//       import.meta.dirname,
//       'preprocessed-housing-owners.jsonl'
//     ),
//     missingHousings: path.resolve(
//       import.meta.dirname,
//       'missing-housings.jsonl'
//     ),
//     missingOwners: path.resolve(import.meta.dirname, 'missing-owners.jsonl')
//   }
// });

run({
  email: 'admin@zerologementvacant.beta.gouv.fr',
  files: {
    input: path.resolve(
      import.meta.dirname,
      'preprocessed-housing-owners.jsonl'
    ),
    conflicts: path.resolve(import.meta.dirname, 'conflicts.jsonl'),
    output: path.resolve(import.meta.dirname, 'results.jsonl')
  },
  from: 'file'
});
