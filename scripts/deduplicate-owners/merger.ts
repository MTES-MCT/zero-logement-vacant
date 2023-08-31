import { Comparison } from './comparison';
import { logger } from '../../server/utils/logger';
import { ownerNotesTable } from '../../server/repositories/noteRepository';
import { ownerEventsTable } from '../../server/repositories/eventRepository';
import { ownersHousingTable } from '../../server/repositories/housingRepository';
import { ownerTable } from '../../server/repositories/ownerRepository';
import db from '../../server/repositories/db';
import { isMatch } from './duplicates';
import fp from 'lodash/fp';
import { ComparisonMergeError } from './comparison-merge-error';

async function merge(comparison: Comparison): Promise<void> {
  if (comparison.needsReview) {
    logger.debug('Manual review needed. Skipping...', comparison);
    return;
  }

  const keeping = comparison.source;
  const removing = comparison.duplicates
    .filter((owner) => isMatch(owner.score))
    .map((owner) => owner.value);

  const removingIds = removing.map((owner) => owner.id);
  await db
    .transaction(async (transaction) => {
      await transaction(ownersHousingTable)
        .update({ owner_id: keeping.id })
        .whereIn('owner_id', removingIds);
      await transaction(ownerEventsTable)
        .update({ owner_id: keeping.id })
        .whereIn('owner_id', removingIds);
      await transaction(ownerNotesTable)
        .update({ owner_id: keeping.id })
        .whereIn('owner_id', removingIds);
      await transaction('old_events')
        .update({ owner_id: keeping.id })
        .whereIn('owner_id', removingIds);
      await transaction(ownerTable).whereIn('id', removingIds).delete();

      const owners = [keeping, ...removing];
      const merged = fp.pickBy((value) => !fp.isNil(value), {
        raw_address: fp.maxBy((owner) => owner.rawAddress.length, owners)
          ?.rawAddress,
        birth_date: !keeping.birthDate
          ? owners.find((owner) => !!owner.birthDate)?.birthDate
          : undefined,
        administrator: owners.find((owner) => !!owner.administrator)
          ?.administrator,
        email: owners.find((owner) => !!owner.email)?.email,
        phone: owners.find((owner) => !!owner.phone)?.phone,
        kind: owners.find((owner) => !!owner.kind)?.kind,
        kind_detail: owners.find((owner) => !!owner.kindDetail)?.kindDetail,
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

const merger = {
  merge,
};

export default merger;
