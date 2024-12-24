import {
  createProcessor,
  FindHousingOwnersOptions
} from '~/scripts/import-unified-owners/processor';
import { AWAITING_RANK, HousingOwnerApi } from '~/models/HousingOwnerApi';
import {
  HousingOwners,
  housingOwnersTable
} from '~/repositories/housingOwnerRepository';
import {
  Owners,
  ownerTable,
  parseHousingOwnerApi
} from '~/repositories/ownerRepository';
import departmentalOwnersRepository from '~/repositories/departmentalOwnersRepository';

export default function createImportUnifiedOwnersCommand() {
  return async (): Promise<void> => {
    const processor = createProcessor({
      findHousingOwners,
      updateHousingOwner,
      removeHousingOwner
    });

    await departmentalOwnersRepository.stream().pipeTo(processor);
  };
}

export async function findHousingOwners(
  options: FindHousingOwnersOptions
): Promise<ReadonlyArray<HousingOwnerApi>> {
  const housingOwners = await HousingOwners()
    .select(`${housingOwnersTable}.*`)
    .join(ownerTable, `${ownerTable}.id`, `${housingOwnersTable}.owner_id`)
    .select(`${ownerTable}.*`)
    .where((where) => {
      where.where({
        owner_id: options.nationalOwner,
        rank: AWAITING_RANK
      });
    })
    .orWhere((where) => {
      where
        .whereIn(
          'owner_id',
          Owners().select('id').where('idpersonne', options.departmentalOwner)
        )
        .where('rank', '>=', 1);
    });

  return housingOwners.map(parseHousingOwnerApi);
}

export async function updateHousingOwner(
  housingOwner: HousingOwnerApi
): Promise<void> {
  await HousingOwners().update({ rank: housingOwner.rank }).where({
    owner_id: housingOwner.ownerId,
    housing_id: housingOwner.housingId,
    housing_geo_code: housingOwner.housingGeoCode
  });
}

export async function removeHousingOwner(
  housingOwner: HousingOwnerApi
): Promise<void> {
  await HousingOwners().delete().where({
    owner_id: housingOwner.ownerId,
    housing_id: housingOwner.housingId,
    housing_geo_code: housingOwner.housingGeoCode
  });
}
