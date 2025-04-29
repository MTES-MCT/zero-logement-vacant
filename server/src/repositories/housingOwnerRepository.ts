import { OwnerRank } from '@zerologementvacant/models';
import db from '~/infra/database';
import { logger } from '~/infra/logger';
import { HousingApi, HousingRecordApi } from '~/models/HousingApi';
import { HousingOwnerApi } from '~/models/HousingOwnerApi';
import { OwnerApi } from '~/models/OwnerApi';

export const housingOwnersTable = 'owners_housing';

export const HousingOwners = (transaction = db) =>
  transaction<HousingOwnerDBO>(housingOwnersTable);

async function insert(housingOwner: HousingOwnerApi): Promise<void> {
  logger.debug('Saving housing owner...', {
    housingOwner
  });

  await HousingOwners()
    .insert(formatHousingOwnerApi(housingOwner))
    .onConflict()
    .ignore();
  logger.debug('Saved housing owner.');
}

async function saveMany(housingOwners: HousingOwnerApi[]): Promise<void> {
  if (housingOwners.length) {
    housingOwners.forEach((housingOwner) => {
      logger.debug('Saving housing owner...', {
        housingOwner
      });
    });

    // Remove owners before inserting them back
    await db.transaction(async (transaction) => {
      const housingGeoCode = housingOwners[0].housingGeoCode;
      const housingId = housingOwners[0].housingId;
      await HousingOwners(transaction)
        .where({
          housing_geo_code: housingGeoCode,
          housing_id: housingId
        })
        .delete();
      await HousingOwners(transaction).insert(
        housingOwners.map(formatHousingOwnerApi)
      );
    });
    logger.debug(`Saved ${housingOwners.length} housing owners.`);
  }
}

export interface HousingOwnerDBO {
  owner_id: string;
  housing_id: string;
  housing_geo_code: string;
  rank: OwnerRank;
  start_date?: Date | null;
  end_date?: Date | null;
  origin?: string;
  idprocpte?: string | null;
  idprodroit?: string | null;
  locprop_source?: string | null;
}

export const formatOwnerHousingApi = (housing: HousingApi): HousingOwnerDBO => {
  if (!housing.owner) {
    throw new Error('Owner is required');
  }
  return {
    housing_id: housing.id,
    housing_geo_code: housing.geoCode,
    rank: 1,
    owner_id: housing.owner.id
  };
};

export const formatHousingOwnerApi = (
  housingOwner: HousingOwnerApi
): HousingOwnerDBO => ({
  owner_id: housingOwner.id,
  housing_id: housingOwner.housingId,
  housing_geo_code: housingOwner.housingGeoCode,
  rank: housingOwner.rank,
  start_date: housingOwner.startDate,
  end_date: housingOwner.endDate,
  origin: housingOwner.origin,
  idprocpte: housingOwner.idprocpte,
  idprodroit: housingOwner.idprodroit,
  locprop_source:
    typeof housingOwner.locprop === 'number'
      ? String(housingOwner.locprop)
      : null
});

export const formatHousingOwnersApi = (
  housing: HousingRecordApi,
  owners: OwnerApi[],
  origin?: string
): HousingOwnerDBO[] =>
  owners.map((owner, i) => ({
    owner_id: owner.id,
    housing_id: housing.id,
    housing_geo_code: housing.geoCode,
    rank: (i + 1) as OwnerRank,
    start_date: new Date(),
    origin
  }));

const housingOwnerRepository = {
  insert,
  saveMany
};

export default housingOwnerRepository;
