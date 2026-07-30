import type { Knex } from 'knex';

/**
 * Location-only updates cannot change campaign/group owner counts. Keep the
 * statement-level transition-table triggers, but skip their expensive
 * recomputation unless the set of primary owner-housing relations changed.
 */

interface OwnerCountTarget {
  functionName: string;
  targetTable: string;
  targetAlias: string;
  relationTable: string;
  relationAlias: string;
  relationId: string;
}

const TARGETS: OwnerCountTarget[] = [
  {
    functionName: 'update_campaign_owner_count_after_update',
    targetTable: 'campaigns',
    targetAlias: 'c',
    relationTable: 'campaigns_housing',
    relationAlias: 'ch',
    relationId: 'campaign_id'
  },
  {
    functionName: 'update_group_owner_count_after_update',
    targetTable: 'groups',
    targetAlias: 'g',
    relationTable: 'groups_housing',
    relationAlias: 'gh',
    relationId: 'group_id'
  }
];

function ownerCountUpdateFunction(
  target: OwnerCountTarget,
  skipUnchangedPrimaryOwners: boolean
): string {
  const guard = skipUnchangedPrimaryOwners
    ? `
      IF NOT EXISTS (
        SELECT owner_id, housing_id, housing_geo_code
        FROM old_rows
        WHERE rank = 1
        EXCEPT
        SELECT owner_id, housing_id, housing_geo_code
        FROM new_rows
        WHERE rank = 1
      ) AND NOT EXISTS (
        SELECT owner_id, housing_id, housing_geo_code
        FROM new_rows
        WHERE rank = 1
        EXCEPT
        SELECT owner_id, housing_id, housing_geo_code
        FROM old_rows
        WHERE rank = 1
      ) THEN
        RETURN NULL;
      END IF;
    `
    : '';

  return `
    CREATE OR REPLACE FUNCTION ${target.functionName}()
    RETURNS TRIGGER AS $$
    BEGIN
      ${guard}
      UPDATE ${target.targetTable} ${target.targetAlias}
      SET owner_count = (
        SELECT COUNT(DISTINCT oh.owner_id)
        FROM ${target.relationTable} ${target.relationAlias}
        JOIN owners_housing oh
          ON oh.housing_id = ${target.relationAlias}.housing_id
         AND oh.housing_geo_code = ${target.relationAlias}.housing_geo_code
         AND oh.rank = 1
        WHERE ${target.relationAlias}.${target.relationId} = ${target.targetAlias}.id
      )
      WHERE ${target.targetAlias}.id IN (
        SELECT DISTINCT ${target.relationAlias}.${target.relationId}
        FROM ${target.relationTable} ${target.relationAlias}
        WHERE (${target.relationAlias}.housing_id, ${target.relationAlias}.housing_geo_code) IN (
          SELECT housing_id, housing_geo_code FROM old_rows WHERE rank = 1
          UNION
          SELECT housing_id, housing_geo_code FROM new_rows WHERE rank = 1
        )
      );
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `;
}

export async function up(knex: Knex): Promise<void> {
  for (const target of TARGETS) {
    await knex.raw(ownerCountUpdateFunction(target, true));
  }
}

export async function down(knex: Knex): Promise<void> {
  for (const target of TARGETS) {
    await knex.raw(ownerCountUpdateFunction(target, false));
  }
}
