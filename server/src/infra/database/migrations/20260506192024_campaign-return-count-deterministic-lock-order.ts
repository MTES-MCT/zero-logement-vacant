import type { Knex } from 'knex';

/**
 * Adds `ORDER BY c.id` to the FOR-loops in
 * `increment_campaign_return_count` and
 * `recompute_return_count_on_housing_status_change`.
 *
 * Both functions iterate the campaigns linked to a housing and lock each
 * campaign row (`FOR UPDATE` in the first, row-level lock from `UPDATE` in
 * the second). Without an `ORDER BY`, PostgreSQL is free to return matching
 * rows in any order — and concurrent transactions touching different
 * housings whose campaign sets overlap can grab the same campaigns in
 * opposite orders, deadlocking on `ShareLock` of the campaigns rows.
 *
 * Locking in `c.id` order makes every transaction acquire locks in the same
 * sequence, which removes the deadlock cycle without changing any of the
 * trigger semantics.
 *
 * Function bodies are otherwise identical to those installed by
 * `20260407092027_campaigns-return-count-add-status-filter`; only the FOR-loop
 * SELECT clauses gain `ORDER BY c.id`. The down migration restores the
 * pre-ORDER-BY versions.
 */
export async function up(knex: Knex): Promise<void> {
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
      SELECT e.type, e.created_at
      INTO v_event_type, v_event_created_at
      FROM events e
      WHERE e.id = NEW.event_id;

      IF v_event_type NOT IN ('housing:status-updated', 'housing:occupancy-updated') THEN
        RETURN NEW;
      END IF;

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
        ORDER BY c.id
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

  await knex.raw(`
    CREATE OR REPLACE FUNCTION recompute_return_count_on_housing_status_change()
    RETURNS TRIGGER AS $$
    DECLARE
      v_campaign_id UUID;
      v_sent_at     TIMESTAMPTZ;
    BEGIN
      IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
      END IF;

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
        ORDER BY c.id
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
  `);
}

export async function down(knex: Knex): Promise<void> {
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
      SELECT e.type, e.created_at
      INTO v_event_type, v_event_created_at
      FROM events e
      WHERE e.id = NEW.event_id;

      IF v_event_type NOT IN ('housing:status-updated', 'housing:occupancy-updated') THEN
        RETURN NEW;
      END IF;

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

  await knex.raw(`
    CREATE OR REPLACE FUNCTION recompute_return_count_on_housing_status_change()
    RETURNS TRIGGER AS $$
    DECLARE
      v_campaign_id UUID;
      v_sent_at     TIMESTAMPTZ;
    BEGIN
      IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
        RETURN NEW;
      END IF;

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
  `);
}
