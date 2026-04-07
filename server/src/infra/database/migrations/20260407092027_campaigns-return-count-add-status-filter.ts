import type { Knex } from 'knex';

/**
 * Add a housing status filter to all return_count calculations.
 *
 * New rule: a housing is counted only when its status is in the range
 * FIRST_CONTACT..BLOCKED (numeric values 2–5) AND it has at least one
 * qualifying event (housing:status-updated or housing:occupancy-updated)
 * created after the campaign's sent_at.
 *
 * Changes:
 *  1. increment_campaign_return_count   — skip housing whose status is outside 2..5
 *  2. recompute_campaign_return_count   — join fast_housing and filter by status
 *  3. update_campaign_counts            — same join/filter in the return_count CASE
 *  4. NEW: recompute_return_count_on_housing_status_change — full recompute for all
 *     campaigns containing the housing whenever its status crosses the 2..5 boundary
 *  5. Backfill — recompute return_count for all campaigns with sent_at IS NOT NULL
 *
 * See docs/database/trigger-campaign-return-count.md for full design rationale.
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Update increment_campaign_return_count() to skip non-qualifying housings.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION increment_campaign_return_count()
    RETURNS TRIGGER AS $$
    DECLARE
      v_campaign_id       UUID;
      v_campaign_sent_at  TIMESTAMPTZ;
      already_counted     BOOLEAN;
      v_event_type        TEXT;
      v_event_created_at  TIMESTAMPTZ;
      v_housing_status    INT;
    BEGIN
      -- housing_events is a junction table; type and created_at live on events.
      SELECT e.type, e.created_at
      INTO v_event_type, v_event_created_at
      FROM events e
      WHERE e.id = NEW.event_id;

      IF v_event_type NOT IN ('housing:status-updated', 'housing:occupancy-updated') THEN
        RETURN NEW;
      END IF;

      -- Only housings with status FIRST_CONTACT..BLOCKED (2..5) count.
      SELECT h.status INTO v_housing_status
      FROM fast_housing h
      WHERE h.id = NEW.housing_id
        AND h.geo_code = NEW.housing_geo_code;

      IF v_housing_status NOT BETWEEN 2 AND 5 THEN
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
  `);

  // 2. Update recompute_campaign_return_count() to filter by housing status.
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
        JOIN fast_housing h ON h.id = ch.housing_id AND h.geo_code = ch.housing_geo_code
        WHERE ch.campaign_id = NEW.id
          AND h.status BETWEEN 2 AND 5
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
  `);

  // 3. Update update_campaign_counts() to filter by housing status.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_campaign_counts()
    RETURNS TRIGGER AS $$
    DECLARE
      v_campaign_id UUID;
      v_sent_at     TIMESTAMPTZ;
    BEGIN
      v_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);

      SELECT sent_at INTO v_sent_at FROM campaigns WHERE id = v_campaign_id;

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
        ),
        return_count = CASE
          WHEN v_sent_at IS NOT NULL THEN (
            SELECT COUNT(DISTINCT ch2.housing_id)
            FROM campaigns_housing ch2
            JOIN fast_housing h ON h.id = ch2.housing_id AND h.geo_code = ch2.housing_geo_code
            WHERE ch2.campaign_id = v_campaign_id
              AND h.status BETWEEN 2 AND 5
              AND EXISTS (
                SELECT 1
                FROM housing_events he
                JOIN events e ON e.id = he.event_id
                WHERE he.housing_geo_code = ch2.housing_geo_code
                  AND he.housing_id       = ch2.housing_id
                  AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
                  AND e.created_at        > v_sent_at
              )
          )
          ELSE return_count
        END
      WHERE id = v_campaign_id;

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 4. New trigger: recompute return_count when a housing's status crosses
  //    the 2..5 boundary (i.e., moves from qualifying to non-qualifying or
  //    vice versa). This keeps return_count consistent with the status filter
  //    without relying solely on the incremental housing_events trigger.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION recompute_return_count_on_housing_status_change()
    RETURNS TRIGGER AS $$
    DECLARE
      v_campaign_id UUID;
      v_sent_at     TIMESTAMPTZ;
    BEGIN
      -- No-op if status did not change.
      IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
      END IF;

      -- No-op if status stayed entirely inside or entirely outside the
      -- qualifying range — the return_count cannot change in that case.
      IF (OLD.status BETWEEN 2 AND 5) = (NEW.status BETWEEN 2 AND 5) THEN
        RETURN NEW;
      END IF;

      FOR v_campaign_id, v_sent_at IN (
        SELECT c.id, c.sent_at
        FROM campaigns_housing ch
        JOIN campaigns c ON c.id = ch.campaign_id
        WHERE ch.housing_id       = NEW.id
          AND ch.housing_geo_code = NEW.geo_code
          AND c.sent_at IS NOT NULL
      ) LOOP
        UPDATE campaigns
        SET return_count = (
          SELECT COUNT(DISTINCT ch2.housing_id)
          FROM campaigns_housing ch2
          JOIN fast_housing h ON h.id = ch2.housing_id AND h.geo_code = ch2.housing_geo_code
          WHERE ch2.campaign_id = v_campaign_id
            AND h.status BETWEEN 2 AND 5
            AND EXISTS (
              SELECT 1
              FROM housing_events he
              JOIN events e ON e.id = he.event_id
              WHERE he.housing_geo_code = ch2.housing_geo_code
                AND he.housing_id       = ch2.housing_id
                AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
                AND e.created_at        > v_sent_at
            )
        )
        WHERE id = v_campaign_id;
      END LOOP;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER trg_recompute_return_count_on_housing_status_change
    AFTER UPDATE OF status ON fast_housing
    FOR EACH ROW
    EXECUTE FUNCTION recompute_return_count_on_housing_status_change();
  `);

  // 5. Backfill: recompute return_count for all campaigns that have been sent,
  //    now applying the housing status filter.
  await knex.raw(`
    UPDATE campaigns c
    SET return_count = (
      SELECT COUNT(DISTINCT ch.housing_id)
      FROM campaigns_housing ch
      JOIN fast_housing h ON h.id = ch.housing_id AND h.geo_code = ch.housing_geo_code
      WHERE ch.campaign_id = c.id
        AND h.status BETWEEN 2 AND 5
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
}

export async function down(knex: Knex): Promise<void> {
  // Drop the new trigger and its function first.
  await knex.raw(
    'DROP TRIGGER IF EXISTS trg_recompute_return_count_on_housing_status_change ON fast_housing'
  );
  await knex.raw(
    'DROP FUNCTION IF EXISTS recompute_return_count_on_housing_status_change'
  );

  // Restore increment_campaign_return_count() without the status check.
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
  `);

  // Restore recompute_campaign_return_count() without the status filter.
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
  `);

  // Restore update_campaign_counts() without the status filter.
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_campaign_counts()
    RETURNS TRIGGER AS $$
    DECLARE
      v_campaign_id UUID;
      v_sent_at     TIMESTAMPTZ;
    BEGIN
      v_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);

      SELECT sent_at INTO v_sent_at FROM campaigns WHERE id = v_campaign_id;

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
        ),
        return_count = CASE
          WHEN v_sent_at IS NOT NULL THEN (
            SELECT COUNT(DISTINCT ch2.housing_id)
            FROM campaigns_housing ch2
            WHERE ch2.campaign_id = v_campaign_id
              AND EXISTS (
                SELECT 1
                FROM housing_events he
                JOIN events e ON e.id = he.event_id
                WHERE he.housing_geo_code = ch2.housing_geo_code
                  AND he.housing_id       = ch2.housing_id
                  AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
                  AND e.created_at        > v_sent_at
              )
          )
          ELSE return_count
        END
      WHERE id = v_campaign_id;

      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Backfill: recompute return_count without the status filter.
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
}
