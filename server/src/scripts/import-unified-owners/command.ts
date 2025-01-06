import {
  createProcessor,
  FindHousingOwnersOptions,
  RemoveEventsOptions
} from '~/scripts/import-unified-owners/processor';
import { AWAITING_RANK, HousingOwnerApi } from '~/models/HousingOwnerApi';
import {
  HousingOwners,
  housingOwnersTable
} from '~/repositories/housingOwnerRepository';
import {
  ownerTable,
  parseHousingOwnerApi
} from '~/repositories/ownerRepository';
import departmentalOwnersRepository from '~/repositories/departmentalOwnersRepository';
import { createLogger } from '~/infra/logger';
import {
  eventsTable,
  HousingEvents,
  housingEventsTable
} from '~/repositories/eventRepository';
import { usersTable } from '~/repositories/userRepository';

const logger = createLogger('command');

export default function createImportUnifiedOwnersCommand() {
  return async (): Promise<void> => {
    const processor = createProcessor({
      findHousingOwners,
      updateHousingOwner,
      removeHousingOwner,
      removeEvents
    });

    await departmentalOwnersRepository.stream().pipeTo(processor);
  };
}

export async function findHousingOwners(
  options: FindHousingOwnersOptions
): Promise<ReadonlyArray<HousingOwnerApi>> {
  const query = HousingOwners()
    .select(`${housingOwnersTable}.*`)
    .join(ownerTable, `${ownerTable}.id`, `${housingOwnersTable}.owner_id`)
    .select(`${ownerTable}.*`);

  // Split the request to allow Postgres to use the indexes
  const [nationalOwners, departmentalOwners] = await Promise.all([
    query.clone().where({
      owner_id: options.nationalOwner,
      rank: AWAITING_RANK
    }),
    query
      .clone()
      .where('idpersonne', options.departmentalOwner)
      .where('rank', '>=', 1)
  ]);
  const housingOwners = nationalOwners.concat(departmentalOwners);
  return housingOwners.map(parseHousingOwnerApi);
}

export async function updateHousingOwner(
  housingOwner: HousingOwnerApi
): Promise<void> {
  logger.debug('Updating housing owner...', housingOwner);
  await HousingOwners().update({ rank: housingOwner.rank }).where({
    owner_id: housingOwner.ownerId,
    housing_id: housingOwner.housingId,
    housing_geo_code: housingOwner.housingGeoCode
  });
}

export async function removeHousingOwner(
  housingOwner: HousingOwnerApi
): Promise<void> {
  logger.debug('Removing housing owner...', housingOwner);
  await HousingOwners().delete().where({
    owner_id: housingOwner.ownerId,
    housing_id: housingOwner.housingId,
    housing_geo_code: housingOwner.housingGeoCode
  });
}

export async function removeEvents(
  options: RemoveEventsOptions
): Promise<void> {
  logger.debug('Removing events...', options);
  await HousingEvents()
    .where({ housing_id: options.housingId })
    .join(eventsTable, `${eventsTable}.id`, `${housingEventsTable}.event_id`)
    .where({ name: 'Changement de propriétaires' })
    .whereRaw(`${eventsTable}.created_at::date = '2024-09-08'`)
    .join(usersTable, `${usersTable}.id`, `${eventsTable}.created_by`)
    .where(`${usersTable}.email`, '=', 'admin@zerologementvacant.beta.gouv.fr')
    .delete();
}
