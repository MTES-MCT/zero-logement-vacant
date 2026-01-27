import type { EnergyConsumption } from '@zerologementvacant/models';
import { Array, Predicate } from 'effect';
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
  dpe_id: string | null;
  class_dpe: EnergyConsumption | null;
  class_ges: EnergyConsumption | null;
  dpe_date_at: string | null;
  dpe_type: string | null;
  heating_building: string | null;
  dpe_import_match: string | null;
}

interface FindOptions {
  filters?: {
    id?: Array<BuildingDBO['id']>;
  };
}

export async function find(
  options?: FindOptions
): Promise<ReadonlyArray<BuildingApi>> {
  const buildings = await Buildings().modify((query) => {
    if (options?.filters?.id?.length) {
      query.whereIn('id', options.filters.id);
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

export function formatBuildingApi(building: BuildingApi): BuildingDBO {
  return {
    id: building.id,
    housing_count: building.housingCount,
    vacant_housing_count: building.vacantHousingCount,
    rent_housing_count: building.rentHousingCount,
    rnb_id: building.rnb?.id ?? null,
    rnb_id_score: building.rnb?.score ?? null,
    dpe_id: building.dpe?.id ?? null,
    class_dpe: building.dpe?.class ?? null,
    class_ges: building.ges?.class ?? null,
    dpe_date_at: building.dpe?.doneAt ?? null,
    dpe_type: building.dpe?.type ?? null,
    heating_building: building.heating ?? null,
    dpe_import_match: building.dpe?.match ?? null
  };
}

export function parseBuildingApi(building: BuildingDBO): BuildingApi {
  const allNonNull = Array.every(Predicate.isNotNull);

  const rnb: BuildingApi['rnb'] = allNonNull([building.rnb_id_score])
    ? {
        id: building.rnb_id,
        score: building.rnb_id_score as number
      }
    : null;
  const dpe: BuildingApi['dpe'] = allNonNull([
    building.dpe_id,
    building.class_dpe,
    building.dpe_date_at,
    building.dpe_type,
    building.dpe_import_match
  ])
    ? {
        id: building.dpe_id as string,
        class: building.class_dpe as EnergyConsumption,
        doneAt: building.dpe_date_at as string,
        type: building.dpe_type as
          | 'dpe appartement individuel'
          | 'dpe maison individuelle',
        match: building.dpe_import_match as 'plot_id' | 'rnb_id'
      }
    : null;
  const ges: BuildingApi['ges'] = allNonNull([building.class_ges])
    ? { class: building.class_ges as EnergyConsumption }
    : null;

  return {
    id: building.id,
    housingCount: building.housing_count,
    vacantHousingCount: building.vacant_housing_count,
    rentHousingCount: building.rent_housing_count ?? 0,
    rnb,
    dpe,
    ges,
    heating: building.heating_building
  };
}

const buildingRepository = {
  find,
  get,
  save,
  saveMany
};

export default buildingRepository;
