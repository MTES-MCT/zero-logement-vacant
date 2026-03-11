import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. Add the column
  await knex.schema.alterTable('campaigns', (table) => {
    table.integer('return_count').notNullable().defaultTo(0);
  });

  // 2. Backfill: compute return_count for campaigns that already have a sent_at.
  await knex.raw(`
    UPDATE campaigns c
    SET return_count = (
      SELECT COUNT(DISTINCT ch.housing_id)
      FROM campaigns_housing ch
      WHERE ch.campaign_id = c.id
        AND EXISTS (
          SELECT 1
          FROM housing_events he
          JOIN events e ON e.id = he.event_id
          WHERE he.housing_geo_code = ch.housing_geo_code
            AND he.housing_id       = ch.housing_id
            AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
            AND e.created_at        > c.sent_at
        )
    )
    WHERE c.sent_at IS NOT NULL
  `);

  // 3. Trigger 1: incremental +1 when a new housing event is inserted.
  //    See docs/database/trigger-campaign-return-count.md for full rationale.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION increment_campaign_return_count()
    RETURNS TRIGGER AS $$
    DECLARE
      v_campaign_id       UUID;
      v_campaign_sent_at  TIMESTAMPTZ;
      already_counted     BOOLEAN;
      v_event_type        TEXT;
      v_event_created_at  TIMESTAMPTZ;
    BEGIN
      -- housing_events is a junction table; type and created_at live on events.
      SELECT e.type, e.created_at
      INTO v_event_type, v_event_created_at
      FROM events e
      WHERE e.id = NEW.event_id;

      IF v_event_type NOT IN ('housing:status-updated', 'housing:occupancy-updated') THEN
        RETURN NEW;
      END IF;

      FOR v_campaign_id, v_campaign_sent_at IN (
        SELECT c.id, c.sent_at
        FROM campaigns_housing ch
        JOIN campaigns c ON c.id = ch.campaign_id
        WHERE ch.housing_geo_code = NEW.housing_geo_code
          AND ch.housing_id       = NEW.housing_id
          AND c.sent_at IS NOT NULL
          AND v_event_created_at  > c.sent_at
      ) LOOP
        PERFORM id FROM campaigns WHERE id = v_campaign_id FOR UPDATE;

        SELECT EXISTS (
          SELECT 1
          FROM housing_events he
          JOIN events e ON e.id = he.event_id
          WHERE he.housing_geo_code = NEW.housing_geo_code
            AND he.housing_id       = NEW.housing_id
            AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
            AND e.created_at        > v_campaign_sent_at
            AND he.event_id        != NEW.event_id
        ) INTO already_counted;

        IF NOT already_counted THEN
          UPDATE campaigns
          SET return_count = return_count + 1
          WHERE id = v_campaign_id;
        END IF;
      END LOOP;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_increment_return_count
    AFTER INSERT ON housing_events
    FOR EACH ROW
    EXECUTE FUNCTION increment_campaign_return_count();
  `);

  // 4. Trigger 2: full recompute when sent_at changes.
  //    Needed because changing sent_at retroactively qualifies/disqualifies
  //    events already in the table — the incremental trigger cannot handle this.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION recompute_campaign_return_count()
    RETURNS TRIGGER AS $$
    BEGIN
      IF NEW.sent_at IS NOT DISTINCT FROM OLD.sent_at THEN
        RETURN NEW;
      END IF;

      IF NEW.sent_at IS NULL THEN
        UPDATE campaigns SET return_count = 0 WHERE id = NEW.id;
        RETURN NEW;
      END IF;

      UPDATE campaigns
      SET return_count = (
        SELECT COUNT(DISTINCT ch.housing_id)
        FROM campaigns_housing ch
        WHERE ch.campaign_id = NEW.id
          AND EXISTS (
            SELECT 1
            FROM housing_events he
            JOIN events e ON e.id = he.event_id
            WHERE he.housing_geo_code = ch.housing_geo_code
              AND he.housing_id       = ch.housing_id
              AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
              AND e.created_at        > NEW.sent_at
          )
      )
      WHERE id = NEW.id;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_recompute_return_count_on_sent_at_change
    AFTER UPDATE OF sent_at ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION recompute_campaign_return_count();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP TRIGGER IF EXISTS trg_recompute_return_count_on_sent_at_change ON campaigns');
  await knex.raw('DROP FUNCTION IF EXISTS recompute_campaign_return_count');
  await knex.raw('DROP TRIGGER IF EXISTS trg_increment_return_count ON housing_events');
  await knex.raw('DROP FUNCTION IF EXISTS increment_campaign_return_count');
  await knex.schema.alterTable('campaigns', (table) => {
    table.dropColumn('return_count');
  });
}
