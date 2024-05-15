import db from '~/infra/database';
import { BuildingApi } from '~/models/BuildingApi';

export const buildingTable = 'buildings';
export const Buildings = (transaction = db) =>
  transaction<BuildingDBO>(buildingTable);

export interface BuildingDBO {
  id: string;
  housing_count: number;
  vacant_housing_count: number;
}

export const formatBuildingApi = (building: BuildingApi): BuildingDBO => ({
  id: building.id,
  housing_count: building.housingCount,
  vacant_housing_count: building.vacantHousingCount,
});

export const parseBuildingApi = (building: BuildingDBO): BuildingApi => ({
  id: building.id,
  housingCount: building.housing_count,
  vacantHousingCount: building.vacant_housing_count,
});
