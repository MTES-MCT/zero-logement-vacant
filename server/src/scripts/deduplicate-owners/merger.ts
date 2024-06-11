import { Comparison } from '../shared/models/Comparison';
import { logger } from '~/infra/logger';
import { ownerNotesTable } from '~/repositories/noteRepository';
import { ownerEventsTable } from '~/repositories/eventRepository';
import { OwnerDBO, Owners, ownerTable } from '~/repositories/ownerRepository';
import db from '~/infra/database/';
import {
  isMatch,
  isStreetNumber,
  needsManualReview,
} from '../shared/owner-processor/duplicates';
import fp from 'lodash/fp';
import { ComparisonMergeError } from './comparisonMergeError';
import {
  HousingOwnerDBO,
  housingOwnersTable,
} from '~/repositories/housingOwnerRepository';
import Stream = Highland.Stream;
import highland from 'highland';

export async function merge(
  comparison: Comparison,
  stream?: Stream<Comparison>,
): Promise<void> {
  if (comparison.needsReview || (await wasRemoved(comparison.source.id))) {
    return;
  }

  const keeping = comparison.source;
  const removing = comparison.duplicates
    .filter(
      (owner) =>
        isMatch(owner.score) && !needsManualReview(comparison.source, [owner]),
    )
    .map((owner) => owner.value);

  const removingIds = removing.map((owner) => owner.id);
  // Add removed ids
  await db
    .transaction(async (transaction) => {
      // Handle the case when the owner appears multiple times in a housing
      const ownersHousing = await transaction(housingOwnersTable).whereIn(
        'owner_id',
        [...removingIds, keeping.id],
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
        stream?.emit('owners-housing:removed', duplicatesRemoved);
        logger.debug(
          `Removed ${duplicatesRemoved} duplicate(s) from owners_housing`,
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
      stream?.emit('owners:removed', removed);
      logger.info('Removed owners', {
        fullName: keeping.fullName,
        removed,
      });

      const owners = [keeping, ...removing];
      const merged: Partial<OwnerDBO> = fp.pickBy((value) => !fp.isNil(value), {
        raw_address: fp
          .maxBy((owner) => owner.rawAddress.length, owners)
          ?.rawAddress?.map((address) => address.replace(/\s+/g, ' '))
          ?.map((address) =>
            isStreetNumber(address) ? fp.trimCharsStart('0', address) : address,
          ),
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
      });
      if (fp.size(merged) > 0) {
        logger.debug('Merge into owner', { id: keeping.id, ...merged });
        await transaction(ownerTable).where({ id: keeping.id }).update(merged);
      }
    })
    .catch((error) => {
      throw new ComparisonMergeError({ comparison, origin: error });
    });
}

async function wasRemoved(id: string): Promise<boolean> {
  const owner = await Owners().where('id', id).first();
  return !owner;
}

function findHousingOwnerDuplicates(
  housingOwners: HousingOwnerDBO[],
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
        (housingOwner) => housingOwner.owner_id !== min.owner_id,
      );
    }),
    fp.values,
    fp.flatten,
  )(housingOwners);
}

export default {
  merge() {
    return (stream: Stream<Comparison>): Stream<void> => {
      return stream.flatMap((comparison) =>
        highland(merge(comparison, stream)),
      );
    };
  },
};
