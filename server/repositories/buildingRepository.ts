import db from './db';
import { BuildingApi } from '../models/BuildingApi';

export const buildingTable = 'buildings';
export const Buildings = () => db(buildingTable);

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
