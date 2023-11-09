import db from './db';
import { HousingApi, HousingRecordApi } from '../models/HousingApi';
import { OwnerApi } from '../models/OwnerApi';
import { HousingOwnerApi } from '../models/HousingOwnerApi';
import { logger } from '../utils/logger';

export const housingOwnersTable = 'owners_housing';

export const HousingOwners = (transaction = db) =>
  transaction<HousingOwnerDBO>(housingOwnersTable);

const saveMany = async (housingOwners: HousingOwnerApi[]): Promise<void> => {
  if (housingOwners.length) {
    logger.debug(`Saving ${housingOwners.length} housing owners...`);
    await HousingOwners()
      .insert(housingOwners.map(formatHousingOwnerApi))
      .onConflict()
      .ignore();
    logger.info(`Saved ${housingOwners.length} housing owners.`);
  }
};

export interface HousingOwnerDBO {
  owner_id: string;
  housing_id: string;
  housing_geo_code: string;
  rank: number;
  start_date?: Date;
  end_date?: Date;
  origin?: string;
}

export const formatOwnerHousingApi = (housing: HousingApi): HousingOwnerDBO => {
  if (!housing.owner) {
    throw new Error('Owner is required');
  }
  return {
    housing_id: housing.id,
    housing_geo_code: housing.geoCode,
    rank: 1,
    owner_id: housing.owner.id,
  };
};

export const formatHousingOwnerApi = (
  housingOwnerApi: HousingOwnerApi
): HousingOwnerDBO => ({
  owner_id: housingOwnerApi.id,
  housing_id: housingOwnerApi.housingId,
  housing_geo_code: housingOwnerApi.housingGeoCode,
  rank: housingOwnerApi.rank,
  start_date: housingOwnerApi.startDate,
  end_date: housingOwnerApi.endDate,
  origin: housingOwnerApi.origin,
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
    rank: i + 1,
    start_date: new Date(),
    origin,
  }));

const housingOwnerRepository = {
  saveMany,
};

export default housingOwnerRepository;
