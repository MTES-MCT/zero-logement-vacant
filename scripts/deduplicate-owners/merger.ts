import { Comparison } from '../shared/models/Comparison';
import { logger } from '../../server/utils/logger';
import { ownerNotesTable } from '../../server/repositories/noteRepository';
import { ownerEventsTable } from '../../server/repositories/eventRepository';
import {
  OwnerDBO,
  ownerTable,
} from '../../server/repositories/ownerRepository';
import db from '../../server/repositories/db';
import { isMatch } from '../shared/owner-processor/duplicates';
import fp from 'lodash/fp';
import { ComparisonMergeError } from './comparisonMergeError';
import { EventManager } from '../../shared/utils/event-manager';
import {
  HousingOwnerDBO,
  housingOwnersTable,
} from '../../server/repositories/housingOwnerRepository';

export interface MergerEventMap {
  'owners:removed': number;
  'owners-housing:removed': number;
}

class Merger extends EventManager<MergerEventMap> {
  async merge(comparison: Comparison): Promise<void> {
    if (comparison.needsReview) {
      return;
    }

    const keeping = comparison.source;
    const removing = comparison.duplicates
      .filter((owner) => isMatch(owner.score))
      .map((owner) => owner.value);

    const removingIds = removing.map((owner) => owner.id);
    await db
      .transaction(async (transaction) => {
        // Handle the case when the owner appears multiple times in a housing
        const ownersHousing = await transaction(housingOwnersTable).whereIn(
          'owner_id',
          [...removingIds, keeping.id]
        );
        const duplicates = findHousingOwnerDuplicates(ownersHousing);
        if (duplicates.length > 0) {
          const duplicatesRemoved = await transaction(housingOwnersTable)
            .modify((query) => {
              duplicates.forEach((duplicate) => {
                query.orWhere({
                  housing_id: duplicate.housing_id,
                  housing_geo_code: duplicate.housing_geo_code,
                  owner_id: duplicate.owner_id,
                });
              });
            })
            .delete();
          this.emit('owners-housing:removed', duplicatesRemoved);
          logger.debug(
            `Removed ${duplicatesRemoved} duplicate(s) from owners_housing`
          );
        }

        await Promise.all([
          // Transfer housing owners
          transaction(housingOwnersTable)
            .update({ owner_id: keeping.id })
            .whereIn('owner_id', removingIds),
          // Transfer owner events
          transaction(ownerEventsTable)
            .update({ owner_id: keeping.id })
            .whereIn('owner_id', removingIds),
          // Transfer owner notes
          transaction(ownerNotesTable)
            .update({ owner_id: keeping.id })
            .whereIn('owner_id', removingIds),
          // Transfer old events
          transaction('old_events')
            .update({ owner_id: keeping.id })
            .whereIn('owner_id', removingIds),
        ]);

        const removed = await transaction(ownerTable)
          .whereIn('id', removingIds)
          .delete();
        this.emit('owners:removed', removed);

        const owners = [keeping, ...removing];
        const merged: Partial<OwnerDBO> = fp.pickBy(
          (value) => !fp.isNil(value),
          {
            raw_address: fp.maxBy((owner) => owner.rawAddress.length, owners)
              ?.rawAddress,
            birth_date: !keeping.birthDate
              ? owners.find((owner) => !!owner.birthDate)?.birthDate
              : undefined,
            administrator: owners.find((owner) => !!owner.administrator)
              ?.administrator,
            email: owners.find((owner) => !!owner.email)?.email,
            phone: owners.find((owner) => !!owner.phone)?.phone,
            owner_kind: owners.find((owner) => !!owner.kind)?.kind,
            owner_kind_detail: owners.find((owner) => !!owner.kindDetail)
              ?.kindDetail,
          }
        );
        if (fp.size(merged) > 0) {
          logger.debug('Merge into owner', { id: keeping.id, ...merged });
          await transaction(ownerTable)
            .where({ id: keeping.id })
            .update(merged);
        }
      })
      .catch((error) => {
        throw new ComparisonMergeError({ comparison, origin: error });
      });
  }
}

function findHousingOwnerDuplicates(
  housingOwners: HousingOwnerDBO[]
): HousingOwnerDBO[] {
  return fp.pipe(
    fp.groupBy<HousingOwnerDBO>('housing_id'),
    fp.pickBy((housingOwners) => housingOwners.length > 1),
    fp.mapValues<HousingOwnerDBO[], HousingOwnerDBO[]>((housingOwners) => {
      const min = fp.minBy('rank', housingOwners);
      if (!min) {
        throw new Error('There should be housing owners here');
      }
      return housingOwners.filter(
        (housingOwner) => housingOwner.owner_id !== min.owner_id
      );
    }),
    fp.values,
    fp.flatten
  )(housingOwners);
}

function createMerger() {
  return new Merger();
}

export default createMerger;
