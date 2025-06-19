import { AWAITING_OWNER_RANK } from '@zerologementvacant/models';
import { createLogger } from '~/infra/logger';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import departmentalOwnersRepository from '~/repositories/departmentalOwnersRepository';
import {
  EVENTS_TABLE,
  HOUSING_EVENTS_TABLE,
  HousingEvents
} from '~/repositories/eventRepository';
import {
  HousingOwners,
  housingOwnersTable
} from '~/repositories/housingOwnerRepository';
import {
  ownerTable,
  parseHousingOwnerApi
} from '~/repositories/ownerRepository';
import { usersTable } from '~/repositories/userRepository';
import {
  createProcessor,
  FindHousingOwnersOptions,
  RemoveEventsOptions
} from '~/scripts/import-unified-owners/processor';

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
      rank: AWAITING_OWNER_RANK
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
    .join(
      EVENTS_TABLE,
      `${EVENTS_TABLE}.id`,
      `${HOUSING_EVENTS_TABLE}.event_id`
    )
    .where({ name: 'Changement de propriétaires' })
    .whereRaw(
      `${EVENTS_TABLE}.created_at::date BETWEEN '2024-09-08' AND '2024-09-09'`
    )
    .join(usersTable, `${usersTable}.id`, `${EVENTS_TABLE}.created_by`)
    .where(`${usersTable}.email`, '=', 'admin@zerologementvacant.beta.gouv.fr')
    .delete();
}
