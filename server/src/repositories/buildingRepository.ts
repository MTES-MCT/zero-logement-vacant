import db, { ConflictOptions, onConflict } from '~/infra/database';
import { BuildingApi } from '~/models/BuildingApi';

export const BUILDING_TABLE = 'buildings';
export const Buildings = (transaction = db) =>
  transaction<BuildingDBO>(BUILDING_TABLE);

export interface BuildingDBO {
  id: string;
  housing_count: number;
  vacant_housing_count: number;
  rent_housing_count: number | null;
  rnb_id: string | null;
  /**
   * A score >= 0 representing the quality of the RNB ID.
   * @see https://doc-datafoncier.cerema.fr/doc/ff/batiment/rnb_id_score
   */
  rnb_id_score: number | null;
}

interface FindOptions {
  filters?: {
    id?: string[];
  };
}

export async function find(
  options?: FindOptions
): Promise<ReadonlyArray<BuildingApi>> {
  const buildings = await Buildings().modify((query) => {
    if (options?.filters?.id?.length) {
      query.whereIn('id', options?.filters.id);
    }
  });
  return buildings.map(parseBuildingApi);
}

export async function get(id: string): Promise<BuildingApi | null> {
  const building = await Buildings().where({ id }).first();
  return building ? parseBuildingApi(building) : null;
}

type SaveOptions = ConflictOptions<BuildingDBO>;

export async function save(
  building: BuildingApi,
  options?: SaveOptions
): Promise<void> {
  await saveMany([building], options);
}

export async function saveMany(
  buildings: ReadonlyArray<BuildingApi>,
  options?: SaveOptions
): Promise<void> {
  await Buildings()
    .insert(buildings.map(formatBuildingApi))
    .modify(
      onConflict({
        onConflict: options?.onConflict ?? ['id'],
        merge: options?.merge ?? [
          'housing_count',
          'vacant_housing_count',
          'rent_housing_count',
          'rnb_id',
          'rnb_id_score'
        ]
      })
    );
}

export const formatBuildingApi = (building: BuildingApi): BuildingDBO => ({
  id: building.id,
  housing_count: building.housingCount,
  vacant_housing_count: building.vacantHousingCount,
  rent_housing_count: building.rentHousingCount,
  rnb_id: building.rnbId,
  rnb_id_score: building.rnbIdScore
});

export const parseBuildingApi = (building: BuildingDBO): BuildingApi => ({
  id: building.id,
  housingCount: building.housing_count,
  vacantHousingCount: building.vacant_housing_count,
  rentHousingCount: building.rent_housing_count,
  rnbId: building.rnb_id,
  rnbIdScore: building.rnb_id_score
});

const buildingRepository = {
  find,
  get,
  save,
  saveMany
};

export default buildingRepository;
