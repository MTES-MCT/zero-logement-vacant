import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add columns
  await knex.schema.alterTable('groups', (table) => {
    table.integer('housing_count').notNullable().defaultTo(0);
    table.integer('owner_count').notNullable().defaultTo(0);
  });

  // 2. Backfill existing groups
  // groups is a small user-created table — backfilling in the migration
  // is safe: the COUNT queries are a one-time cost at deploy time.
  await knex.raw(`
    UPDATE groups g
    SET
      housing_count = (
        SELECT COUNT(*)
        FROM groups_housing
        WHERE group_id = g.id
      ),
      owner_count = (
        SELECT COUNT(DISTINCT oh.owner_id)
        FROM groups_housing gh
        JOIN owners_housing oh
          ON oh.housing_id       = gh.housing_id
         AND oh.housing_geo_code = gh.housing_geo_code
         AND oh.rank = 1
        WHERE gh.group_id = g.id
      )
  `);

  // 3. Trigger A (INSERT): groups_housing INSERT → recompute both counts once per statement.
  //    Statement-level avoids O(N²) recomputes when bulk-inserting housing into a group.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_group_counts_after_insert()
    RETURNS TRIGGER AS $$
    DECLARE
      v_group_id UUID;
    BEGIN
      FOR v_group_id IN (
        SELECT DISTINCT group_id FROM new_rows
      ) LOOP
        UPDATE groups
        SET
          housing_count = (
            SELECT COUNT(*)
            FROM groups_housing
            WHERE group_id = v_group_id
          ),
          owner_count = (
            SELECT COUNT(DISTINCT oh.owner_id)
            FROM groups_housing gh
            JOIN owners_housing oh
              ON oh.housing_id       = gh.housing_id
             AND oh.housing_geo_code = gh.housing_geo_code
             AND oh.rank = 1
            WHERE gh.group_id = v_group_id
          )
        WHERE id = v_group_id;
      END LOOP;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_group_counts_after_insert
    AFTER INSERT ON groups_housing
    REFERENCING NEW TABLE AS new_rows
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_group_counts_after_insert();
  `);

  // 3b. Trigger A (DELETE): groups_housing DELETE → recompute both counts once per statement.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_group_counts_after_delete()
    RETURNS TRIGGER AS $$
    DECLARE
      v_group_id UUID;
    BEGIN
      FOR v_group_id IN (
        SELECT DISTINCT group_id FROM old_rows
      ) LOOP
        UPDATE groups
        SET
          housing_count = (
            SELECT COUNT(*)
            FROM groups_housing
            WHERE group_id = v_group_id
          ),
          owner_count = (
            SELECT COUNT(DISTINCT oh.owner_id)
            FROM groups_housing gh
            JOIN owners_housing oh
              ON oh.housing_id       = gh.housing_id
             AND oh.housing_geo_code = gh.housing_geo_code
             AND oh.rank = 1
            WHERE gh.group_id = v_group_id
          )
        WHERE id = v_group_id;
      END LOOP;
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_group_counts_after_delete
    AFTER DELETE ON groups_housing
    REFERENCING OLD TABLE AS old_rows
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_group_counts_after_delete();
  `);

  // 4. Trigger B: owners_housing INSERT/DELETE/UPDATE OF rank → recompute owner_count
  //    Guard: exits early when rank=1 is not involved.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_group_owner_count()
    RETURNS TRIGGER AS $$
    DECLARE
      v_group_id         UUID;
      v_housing_id       UUID;
      v_housing_geo_code VARCHAR(255);
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF NEW.rank != 1 THEN RETURN NEW; END IF;
        v_housing_id       := NEW.housing_id;
        v_housing_geo_code := NEW.housing_geo_code;
      ELSIF TG_OP = 'DELETE' THEN
        IF OLD.rank != 1 THEN RETURN OLD; END IF;
        v_housing_id       := OLD.housing_id;
        v_housing_geo_code := OLD.housing_geo_code;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.rank != 1 AND NEW.rank != 1 THEN RETURN NEW; END IF;
        v_housing_id       := NEW.housing_id;
        v_housing_geo_code := NEW.housing_geo_code;
      END IF;

      FOR v_group_id IN (
        SELECT group_id FROM groups_housing
        WHERE housing_id       = v_housing_id
          AND housing_geo_code = v_housing_geo_code
      ) LOOP
        UPDATE groups
        SET owner_count = (
          SELECT COUNT(DISTINCT oh.owner_id)
          FROM groups_housing gh
          JOIN owners_housing oh
            ON oh.housing_id       = gh.housing_id
           AND oh.housing_geo_code = gh.housing_geo_code
           AND oh.rank = 1
          WHERE gh.group_id = v_group_id
        )
        WHERE id = v_group_id;
      END LOOP;

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_group_owner_count
    AFTER INSERT OR DELETE OR UPDATE OF rank ON owners_housing
    FOR EACH ROW
    EXECUTE FUNCTION update_group_owner_count();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_update_group_owner_count ON owners_housing'
  );
  await knex.raw('DROP FUNCTION IF EXISTS update_group_owner_count');
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_update_group_counts_after_delete ON groups_housing'
  );
  await knex.raw('DROP FUNCTION IF EXISTS update_group_counts_after_delete');
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_update_group_counts_after_insert ON groups_housing'
  );
  await knex.raw('DROP FUNCTION IF EXISTS update_group_counts_after_insert');
  await knex.schema.alterTable('groups', (table) => {
    table.dropColumn('owner_count');
    table.dropColumn('housing_count');
  });
}
