import type { EnergyConsumption } from '@zerologementvacant/models';
import { Array, Predicate } from 'effect';
import { snakeToCamel } from 'effect/String';
import type { Insertable, Selectable } from 'kysely';
import { match, Pattern } from 'ts-pattern';

import db, { ConflictOptions } from '~/infra/database';
import type { DB } from '~/infra/database/db';
import { kysely } from '~/infra/database/kysely';
import { withinKyselyTransaction } from '~/infra/database/kysely-transaction';
import { BuildingApi } from '~/models/BuildingApi';

export const BUILDING_TABLE = 'buildings';
// Knex accessor — re-exported for backward compatibility with seeds and tests.
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
  rnb_footprint: number | null;
  dpe_id: string | null;
  class_dpe: EnergyConsumption | null;
  class_ges: EnergyConsumption | null;
  dpe_date_at: Date | string | null;
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
  let query = kysely.selectFrom('buildings').selectAll('buildings');
  if (options?.filters?.id?.length) {
    query = query.where('buildings.id', 'in', options.filters.id);
  }
  const buildings = await query.execute();
  return buildings.map(parseBuildingRow);
}

export async function get(id: string): Promise<BuildingApi | null> {
  const building = await kysely
    .selectFrom('buildings')
    .selectAll('buildings')
    .where('buildings.id', '=', id)
    .executeTakeFirst();
  return building ? parseBuildingRow(building) : null;
}

type SaveOptions = ConflictOptions<BuildingDBO>;

// Default columns updated on conflict, mirroring the previous Knex `.merge(...)`.
const DEFAULT_MERGE_COLUMNS: ReadonlyArray<keyof BuildingDBO> = [
  'housing_count',
  'vacant_housing_count',
  'rent_housing_count',
  'rnb_id',
  'rnb_id_score'
];

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
  if (buildings.length === 0) {
    return;
  }

  await withinKyselyTransaction(async (trx) => {
    await trx
      .insertInto('buildings')
      .values(buildings.map(toBuildingInsert))
      .onConflict((oc) => {
        const conflictColumns = (options?.onConflict ?? ['id']).map((column) =>
          snakeToCamel(column as string)
        );
        const conflict = oc.columns(conflictColumns as any);

        const merge = options?.merge ?? DEFAULT_MERGE_COLUMNS;
        if (merge === false) {
          return conflict.doNothing();
        }
        const columns = (
          merge === true
            ? Object.keys(toBuildingInsert({} as BuildingApi))
            : merge.map((column) => snakeToCamel(column as string))
        ).filter((column) => !conflictColumns.includes(column));
        // An explicit empty merge list means "update nothing on conflict".
        if (columns.length === 0) {
          return conflict.doNothing();
        }
        return conflict.doUpdateSet((eb: any) =>
          Object.fromEntries(
            columns.map((column) => [column, eb.ref(`excluded.${column}`)])
          )
        );
      })
      .execute();
  });
}

// Camel-case Insertable mirror of formatBuildingApi for the Kysely write path.
export function toBuildingInsert(
  building: BuildingApi
): Insertable<DB['buildings']> {
  return {
    id: building.id,
    housingCount: building.housingCount,
    vacantHousingCount: building.vacantHousingCount,
    rentHousingCount: building.rentHousingCount,
    rnbId: building.rnb?.id ?? null,
    rnbIdScore: building.rnb?.score ?? null,
    rnbFootprint: null,
    dpeId: building.dpe?.id ?? null,
    classDpe: building.dpe?.class ?? null,
    classGes: building.ges?.class ?? null,
    dpeDateAt: building.dpe?.doneAt ?? null,
    dpeType: building.dpe?.type ?? null,
    heatingBuilding: building.heating ?? null,
    dpeImportMatch: building.dpe?.match ?? null
  };
}

export function formatBuildingApi(building: BuildingApi): BuildingDBO {
  return {
    id: building.id,
    housing_count: building.housingCount,
    vacant_housing_count: building.vacantHousingCount,
    rent_housing_count: building.rentHousingCount,
    rnb_id: building.rnb?.id ?? null,
    rnb_id_score: building.rnb?.score ?? null,
    rnb_footprint: null,
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
        doneAt: match(building.dpe_date_at)
          .with(Pattern.instanceOf(Date), (date) =>
            date.toISOString().substring(0, 'yyyy-mm-dd'.length)
          )
          .otherwise((date) => date as string),
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

// Camel-case Kysely mirror of parseBuildingApi: maps the CamelCasePlugin row
// back to the snake-case BuildingDBO so the nullable branching lives in one place.
function parseBuildingRow(row: Selectable<DB['buildings']>): BuildingApi {
  return parseBuildingApi({
    id: row.id,
    housing_count: row.housingCount,
    vacant_housing_count: row.vacantHousingCount,
    rent_housing_count: row.rentHousingCount,
    rnb_id: row.rnbId,
    rnb_id_score: row.rnbIdScore,
    rnb_footprint: row.rnbFootprint,
    dpe_id: row.dpeId,
    class_dpe: row.classDpe as EnergyConsumption | null,
    class_ges: row.classGes as EnergyConsumption | null,
    dpe_date_at: row.dpeDateAt,
    dpe_type: row.dpeType,
    heating_building: row.heatingBuilding,
    dpe_import_match: row.dpeImportMatch
  });
}

const buildingRepository = {
  find,
  get,
  save,
  saveMany
};

export default buildingRepository;
