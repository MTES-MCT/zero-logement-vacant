import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Update update_campaign_counts() to also recompute return_count when a
  // housing is detached from a sent campaign. Previously, return_count was
  // only updated by the housing_events trigger and the sent_at trigger, so
  // detaching a housing with qualifying events left return_count stale.
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
}

export async function down(knex: Knex): Promise<void> {
  // Restore the original function without return_count handling
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
  `);
}
