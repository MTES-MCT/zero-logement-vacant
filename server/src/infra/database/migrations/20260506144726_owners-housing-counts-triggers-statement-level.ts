import type { Knex } from 'knex';

/**
 * Converts the campaign/group `owner_count` recompute triggers on
 * `owners_housing` from FOR EACH ROW to FOR EACH STATEMENT with transition
 * tables.
 *
 * The original triggers (added in `20260319181202_campaigns-add-counts` and
 * `20260407174838_groups-add-counts`) recompute a heavy `COUNT(DISTINCT)` for
 * every campaign/group containing the affected housing, once per row. Bulk
 * imports that touch hundreds of housings per statement (LOVAC) repeat the
 * same recompute over the same campaigns hundreds of times.
 *
 * The set of campaigns/groups to recompute is a function of the *set* of
 * affected housings, so a per-statement implementation produces identical
 * final state with O(affected campaigns) work instead of O(rows touched).
 */

export async function up(knex: Knex): Promise<void> {
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_update_campaign_owner_count ON owners_housing'
  );
  await knex.raw('DROP FUNCTION IF EXISTS update_campaign_owner_count');
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_update_group_owner_count ON owners_housing'
  );
  await knex.raw('DROP FUNCTION IF EXISTS update_group_owner_count');

  // ===== Campaigns =====

  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_campaign_owner_count_after_insert()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE campaigns c
      SET owner_count = (
        SELECT COUNT(DISTINCT oh.owner_id)
        FROM campaigns_housing ch
        JOIN owners_housing oh
          ON oh.housing_id       = ch.housing_id
         AND oh.housing_geo_code = ch.housing_geo_code
         AND oh.rank = 1
        WHERE ch.campaign_id = c.id
      )
      WHERE c.id IN (
        SELECT DISTINCT ch.campaign_id
        FROM campaigns_housing ch
        WHERE (ch.housing_id, ch.housing_geo_code) IN (
          SELECT DISTINCT housing_id, housing_geo_code
          FROM new_rows
          WHERE rank = 1
        )
      );
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_campaign_owner_count_after_insert
    AFTER INSERT ON owners_housing
    REFERENCING NEW TABLE AS new_rows
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_campaign_owner_count_after_insert();
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_campaign_owner_count_after_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE campaigns c
      SET owner_count = (
        SELECT COUNT(DISTINCT oh.owner_id)
        FROM campaigns_housing ch
        JOIN owners_housing oh
          ON oh.housing_id       = ch.housing_id
         AND oh.housing_geo_code = ch.housing_geo_code
         AND oh.rank = 1
        WHERE ch.campaign_id = c.id
      )
      WHERE c.id IN (
        SELECT DISTINCT ch.campaign_id
        FROM campaigns_housing ch
        WHERE (ch.housing_id, ch.housing_geo_code) IN (
          SELECT DISTINCT housing_id, housing_geo_code
          FROM old_rows
          WHERE rank = 1
        )
      );
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_campaign_owner_count_after_delete
    AFTER DELETE ON owners_housing
    REFERENCING OLD TABLE AS old_rows
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_campaign_owner_count_after_delete();
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_campaign_owner_count_after_update()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE campaigns c
      SET owner_count = (
        SELECT COUNT(DISTINCT oh.owner_id)
        FROM campaigns_housing ch
        JOIN owners_housing oh
          ON oh.housing_id       = ch.housing_id
         AND oh.housing_geo_code = ch.housing_geo_code
         AND oh.rank = 1
        WHERE ch.campaign_id = c.id
      )
      WHERE c.id IN (
        SELECT DISTINCT ch.campaign_id
        FROM campaigns_housing ch
        WHERE (ch.housing_id, ch.housing_geo_code) IN (
          SELECT housing_id, housing_geo_code FROM old_rows WHERE rank = 1
          UNION
          SELECT housing_id, housing_geo_code FROM new_rows WHERE rank = 1
        )
      );
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_campaign_owner_count_after_update
    AFTER UPDATE ON owners_housing
    REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_campaign_owner_count_after_update();
  `);

  // ===== Groups =====

  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_group_owner_count_after_insert()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE groups g
      SET owner_count = (
        SELECT COUNT(DISTINCT oh.owner_id)
        FROM groups_housing gh
        JOIN owners_housing oh
          ON oh.housing_id       = gh.housing_id
         AND oh.housing_geo_code = gh.housing_geo_code
         AND oh.rank = 1
        WHERE gh.group_id = g.id
      )
      WHERE g.id IN (
        SELECT DISTINCT gh.group_id
        FROM groups_housing gh
        WHERE (gh.housing_id, gh.housing_geo_code) IN (
          SELECT DISTINCT housing_id, housing_geo_code
          FROM new_rows
          WHERE rank = 1
        )
      );
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_group_owner_count_after_insert
    AFTER INSERT ON owners_housing
    REFERENCING NEW TABLE AS new_rows
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_group_owner_count_after_insert();
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_group_owner_count_after_delete()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE groups g
      SET owner_count = (
        SELECT COUNT(DISTINCT oh.owner_id)
        FROM groups_housing gh
        JOIN owners_housing oh
          ON oh.housing_id       = gh.housing_id
         AND oh.housing_geo_code = gh.housing_geo_code
         AND oh.rank = 1
        WHERE gh.group_id = g.id
      )
      WHERE g.id IN (
        SELECT DISTINCT gh.group_id
        FROM groups_housing gh
        WHERE (gh.housing_id, gh.housing_geo_code) IN (
          SELECT DISTINCT housing_id, housing_geo_code
          FROM old_rows
          WHERE rank = 1
        )
      );
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_group_owner_count_after_delete
    AFTER DELETE ON owners_housing
    REFERENCING OLD TABLE AS old_rows
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_group_owner_count_after_delete();
  `);

  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_group_owner_count_after_update()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE groups g
      SET owner_count = (
        SELECT COUNT(DISTINCT oh.owner_id)
        FROM groups_housing gh
        JOIN owners_housing oh
          ON oh.housing_id       = gh.housing_id
         AND oh.housing_geo_code = gh.housing_geo_code
         AND oh.rank = 1
        WHERE gh.group_id = g.id
      )
      WHERE g.id IN (
        SELECT DISTINCT gh.group_id
        FROM groups_housing gh
        WHERE (gh.housing_id, gh.housing_geo_code) IN (
          SELECT housing_id, housing_geo_code FROM old_rows WHERE rank = 1
          UNION
          SELECT housing_id, housing_geo_code FROM new_rows WHERE rank = 1
        )
      );
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_group_owner_count_after_update
    AFTER UPDATE ON owners_housing
    REFERENCING OLD TABLE AS old_rows NEW TABLE AS new_rows
    FOR EACH STATEMENT
    EXECUTE FUNCTION update_group_owner_count_after_update();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_update_campaign_owner_count_after_insert ON owners_housing'
  );
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_update_campaign_owner_count_after_delete ON owners_housing'
  );
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_update_campaign_owner_count_after_update ON owners_housing'
  );
  await knex.raw(
    'DROP FUNCTION IF EXISTS update_campaign_owner_count_after_insert'
  );
  await knex.raw(
    'DROP FUNCTION IF EXISTS update_campaign_owner_count_after_delete'
  );
  await knex.raw(
    'DROP FUNCTION IF EXISTS update_campaign_owner_count_after_update'
  );

  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_update_group_owner_count_after_insert ON owners_housing'
  );
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_update_group_owner_count_after_delete ON owners_housing'
  );
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_update_group_owner_count_after_update ON owners_housing'
  );
  await knex.raw(
    'DROP FUNCTION IF EXISTS update_group_owner_count_after_insert'
  );
  await knex.raw(
    'DROP FUNCTION IF EXISTS update_group_owner_count_after_delete'
  );
  await knex.raw(
    'DROP FUNCTION IF EXISTS update_group_owner_count_after_update'
  );

  // Restore the original FOR EACH ROW triggers (verbatim from
  // 20260319181202_campaigns-add-counts and 20260407174838_groups-add-counts).
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_campaign_owner_count()
    RETURNS TRIGGER AS $$
    DECLARE
      v_campaign_id      UUID;
      v_housing_id       UUID;
      v_housing_geo_code VARCHAR(255);
    BEGIN
      IF TG_OP = 'INSERT' THEN
        IF NEW.rank != 1 THEN RETURN NEW; END IF;
        v_housing_id := NEW.housing_id;
        v_housing_geo_code := NEW.housing_geo_code;
      ELSIF TG_OP = 'DELETE' THEN
        IF OLD.rank != 1 THEN RETURN OLD; END IF;
        v_housing_id := OLD.housing_id;
        v_housing_geo_code := OLD.housing_geo_code;
      ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.rank != 1 AND NEW.rank != 1 THEN RETURN NEW; END IF;
        v_housing_id := NEW.housing_id;
        v_housing_geo_code := NEW.housing_geo_code;
      END IF;

      FOR v_campaign_id IN (
        SELECT campaign_id FROM campaigns_housing
        WHERE housing_id = v_housing_id
          AND housing_geo_code = v_housing_geo_code
      ) LOOP
        UPDATE campaigns
        SET owner_count = (
          SELECT COUNT(DISTINCT oh.owner_id)
          FROM campaigns_housing ch
          JOIN owners_housing oh
            ON oh.housing_id = ch.housing_id
           AND oh.housing_geo_code = ch.housing_geo_code
           AND oh.rank = 1
          WHERE ch.campaign_id = v_campaign_id
        )
        WHERE id = v_campaign_id;
      END LOOP;

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_campaign_owner_count
    AFTER INSERT OR DELETE OR UPDATE OF rank ON owners_housing
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_owner_count();
  `);

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
