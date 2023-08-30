import { Comparison } from './comparison';
import { logger } from '../../server/utils/logger';
import { isMatch } from './duplicates';
import { ownerNotesTable } from '../../server/repositories/noteRepository';
import { ownerEventsTable } from '../../server/repositories/eventRepository';
import { ownersHousingTable } from '../../server/repositories/housingRepository';
import { ownerTable } from '../../server/repositories/ownerRepository';
import db from '../../server/repositories/db';

async function merge(comparison: Comparison): Promise<void> {
  if (comparison.needsReview) {
    logger.debug('Manual review needed. Skipping...', comparison);
    return;
  }

  if (!comparison.suggestion) {
    logger.debug('No suggestion left. Skipping...', comparison);
    return;
  }

  const keeping = comparison.suggestion;
  const removing = [
    comparison.source,
    ...comparison.duplicates.filter(isMatch).map((dup) => dup.value),
  ].filter((owner) => owner.id !== keeping.id);

  logger.debug(`Merging...`, { keeping, removing });

  const removingIds = removing.map((owner) => owner.id);
  await db.transaction(async (transaction) => {
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
    await transaction(ownerTable)
      .where({ id: keeping.id })
      .update({
        // Merge values into the suggested owner we keep
        birth_date: owners.find((owner) => !!owner.birthDate)?.birthDate,
        administrator: owners.find((owner) => !!owner.administrator)
          ?.administrator,
        email: owners.find((owner) => !!owner.email)?.email,
        phone: owners.find((owner) => !!owner.phone)?.phone,
        kind: owners.find((owner) => !!owner.kind)?.kind,
        kind_detail: owners.find((owner) => !!owner.kindDetail)?.kindDetail,
      });
  });
}

const merger = {
  merge,
};

export default merger;
