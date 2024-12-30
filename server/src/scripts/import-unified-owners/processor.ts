import async from 'async';
import { List, Map } from 'immutable';
import { WritableStream } from 'node:stream/web';

import { DepartmentalOwnerDBO } from '~/repositories/departmentalOwnersRepository';
import { createLogger } from '~/infra/logger';
import { AWAITING_RANK, HousingOwnerApi } from '~/models/HousingOwnerApi';

const logger = createLogger('processor');

export interface FindHousingOwnersOptions {
  /**
   * The national owner’s id.
   */
  nationalOwner: string;
  /**
   * The departmental owner’s idpersonne.
   */
  departmentalOwner: string;
}

export interface RemoveEventsOptions {
  housingId: string;
}

export interface ProcessorOptions {
  findHousingOwners(
    options: FindHousingOwnersOptions
  ): Promise<ReadonlyArray<HousingOwnerApi>>;
  updateHousingOwner(housingOwner: HousingOwnerApi): Promise<void>;
  removeHousingOwner(housingOwner: HousingOwnerApi): Promise<void>;
  removeEvents(options: RemoveEventsOptions): Promise<void>;
}

export function createProcessor(options: ProcessorOptions) {
  const {
    findHousingOwners,
    updateHousingOwner,
    removeHousingOwner,
    removeEvents
  } = options;

  return new WritableStream<DepartmentalOwnerDBO>({
    async write(chunk): Promise<void> {
      try {
        logger.debug('Processing departmental owner...', { chunk });

        const housingOwners = await findHousingOwners({
          nationalOwner: chunk.owner_id,
          departmentalOwner: chunk.owner_idpersonne
        });
        const pairs = toPairs(housingOwners);
        // Remove the departmental housing owner
        // Update the national housing owner
        await async.forEach(
          pairs
            .toIndexedSeq()
            .map(
              (housingOwners) =>
                housingOwners.toArray() as [HousingOwnerApi, HousingOwnerApi]
            )
            .toArray(),
          async ([nationalOwner, departmentalOwner]) => {
            await removeHousingOwner(departmentalOwner);
            await updateHousingOwner({
              ...nationalOwner,
              rank: departmentalOwner.rank
            });
          }
        );
        // Remove the associated events
        await async.forEach(pairs.keys(), async (housingId) => {
          await removeEvents({ housingId });
        });
      } catch (error) {
        logger.error(error);
        throw error;
      }
    }
  });
}

export function toPairs(
  housingOwners: ReadonlyArray<HousingOwnerApi>
): Map<HousingOwnerApi['housingId'], List<HousingOwnerApi>> {
  return List(housingOwners)
    .groupBy((housingOwner) => housingOwner.housingId)
    .filter(
      (housingOwners) =>
        housingOwners.size === 2 &&
        housingOwners.some(
          (housingOwner) =>
            isNationalOwner(housingOwner) && housingOwner.rank === AWAITING_RANK
        ) &&
        housingOwners.some(
          (housingOwner) =>
            isDepartmentalOwner(housingOwner) && housingOwner.rank >= 1
        )
    )
    .map((housingOwners) =>
      housingOwners.sortBy((housingOwner) => housingOwner.rank)
    );
}

export function isNationalOwner(housingOwner: HousingOwnerApi): boolean {
  return !housingOwner.idpersonne;
}

export function isDepartmentalOwner(housingOwner: HousingOwnerApi): boolean {
  return !isNationalOwner(housingOwner);
}
