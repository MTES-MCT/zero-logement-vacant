import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add columns
  await knex.schema.alterTable('campaigns', (table) => {
    table.integer('housing_count').notNullable().defaultTo(0);
    table.integer('owner_count').notNullable().defaultTo(0);
  });

  // GENERATED ALWAYS AS cannot be expressed via knex schema builder — use raw
  await knex.raw(`
    ALTER TABLE campaigns
    ADD COLUMN return_rate FLOAT
    GENERATED ALWAYS AS (return_count::float / NULLIF(housing_count, 0))
    STORED
  `);

  // 2. Backfill existing campaigns
  await knex.raw(`
    UPDATE campaigns c
    SET
      housing_count = (
        SELECT COUNT(*) FROM campaigns_housing WHERE campaign_id = c.id
      ),
      owner_count = (
        SELECT COUNT(DISTINCT oh.owner_id)
        FROM campaigns_housing ch
        JOIN owners_housing oh
          ON oh.housing_id = ch.housing_id
         AND oh.housing_geo_code = ch.housing_geo_code
         AND oh.rank = 1
        WHERE ch.campaign_id = c.id
      )
  `);

  // 3. Trigger A: campaigns_housing INSERT/DELETE → recompute housing_count and owner_count
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_campaign_counts()
    RETURNS TRIGGER AS $$
    DECLARE
      v_campaign_id UUID;
    BEGIN
      v_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);

      UPDATE campaigns
      SET
        housing_count = (
          SELECT COUNT(*)
          FROM campaigns_housing
          WHERE campaign_id = v_campaign_id
        ),
        owner_count = (
          SELECT COUNT(DISTINCT oh.owner_id)
          FROM campaigns_housing ch
          JOIN owners_housing oh
            ON oh.housing_id = ch.housing_id
           AND oh.housing_geo_code = ch.housing_geo_code
           AND oh.rank = 1
          WHERE ch.campaign_id = v_campaign_id
        )
      WHERE id = v_campaign_id;

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_update_campaign_counts
    AFTER INSERT OR DELETE ON campaigns_housing
    FOR EACH ROW
    EXECUTE FUNCTION update_campaign_counts();
  `);

  // 4. Trigger B: owners_housing INSERT/DELETE/UPDATE OF rank → recompute owner_count
  //    Guard: exits early when rank=1 is not involved.
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
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_update_campaign_owner_count ON owners_housing');
  await knex.raw('DROP FUNCTION IF EXISTS update_campaign_owner_count');
  await knex.raw('DROP TRIGGER IF EXISTS trg_update_campaign_counts ON campaigns_housing');
  await knex.raw('DROP FUNCTION IF EXISTS update_campaign_counts');
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('return_rate');
    table.dropColumn('owner_count');
    table.dropColumn('housing_count');
  });
}
