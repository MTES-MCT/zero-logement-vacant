import { WritableStream } from 'node:stream/web';
import { DepartmentalOwnerDBO } from '~/repositories/departmentalOwnersRepository';
import { createLogger } from '~/infra/logger';
import { AWAITING_RANK, HousingOwnerApi } from '~/models/HousingOwnerApi';
import { List } from 'immutable';
import async from 'async';

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

export interface ProcessorOptions {
  findHousingOwners(
    options: FindHousingOwnersOptions
  ): Promise<ReadonlyArray<HousingOwnerApi>>;
  updateHousingOwner(housingOwner: HousingOwnerApi): Promise<void>;
  removeHousingOwner(housingOwner: HousingOwnerApi): Promise<void>;
}

export function createProcessor(options: ProcessorOptions) {
  const { findHousingOwners, updateHousingOwner, removeHousingOwner } = options;

  return new WritableStream<DepartmentalOwnerDBO>({
    async write(chunk): Promise<void> {
      try {
        logger.debug('Processing departmental owner...', { chunk });

        const housingOwners = await findHousingOwners({
          nationalOwner: chunk.owner_id,
          departmentalOwner: chunk.owner_idpersonne
        });
        const pairs = toPairs(housingOwners);
        await async.forEach(
          pairs,
          async ([nationalOwner, departmentalOwner]) => {
            await removeHousingOwner(departmentalOwner);
            await updateHousingOwner({
              ...nationalOwner,
              rank: departmentalOwner.rank
            });
          }
        );
      } catch (error) {
        // TODO
      }
    }
  });
}

export function toPairs(
  housingOwners: ReadonlyArray<HousingOwnerApi>
): [HousingOwnerApi, HousingOwnerApi][] {
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
    )
    .toIndexedSeq()
    .map(
      (housingOwners) =>
        housingOwners.toArray() as [HousingOwnerApi, HousingOwnerApi]
    )
    .toArray();
}

export function isNationalOwner(housingOwner: HousingOwnerApi): boolean {
  return !housingOwner.idpersonne;
}

export function isDepartmentalOwner(housingOwner: HousingOwnerApi): boolean {
  return !isNationalOwner(housingOwner);
}
