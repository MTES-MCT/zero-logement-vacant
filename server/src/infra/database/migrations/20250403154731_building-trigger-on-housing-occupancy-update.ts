import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE OR REPLACE FUNCTION update_building_stats()
    RETURNS TRIGGER AS
    $$
    BEGIN
        DECLARE
            building VARCHAR(255);
        BEGIN
            IF TG_OP = 'DELETE' THEN
                building := OLD.building_id;
            ELSE
                building := NEW.building_id;
            END IF;

            -- Si le building a changé, mettre à jour les deux bâtiments
            IF TG_OP = 'UPDATE' AND OLD.building_id IS DISTINCT FROM NEW.building_id THEN
                -- Mettre à jour l'ancien bâtiment si nécessaire
                IF OLD.building_id IS NOT NULL THEN
                    UPDATE buildings
                    SET
                        rent_housing_count = (
                            SELECT COUNT(*)
                            FROM fast_housing
                            WHERE building_id = OLD.building_id
                            AND occupancy = 'L'
                        ),
                        vacant_housing_count = (
                            SELECT COUNT(*)
                            FROM fast_housing
                            WHERE building_id = OLD.building_id
                            AND occupancy = 'V'
                        )
                    WHERE id = OLD.building_id;
                END IF;
            END IF;

            -- Mettre à jour le bâtiment actuel si nécessaire
            IF building IS NOT NULL THEN
                UPDATE buildings
                SET
                    rent_housing_count = (
                        SELECT COUNT(*)
                        FROM fast_housing
                        WHERE building_id = building
                        AND occupancy = 'L'
                    ),
                    vacant_housing_count = (
                        SELECT COUNT(*)
                        FROM fast_housing
                        WHERE building_id = building
                        AND occupancy = 'V'
                    )
                WHERE id = building;
            END IF;
        END;

        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- Trigger pour INSERT
    CREATE TRIGGER housing_insert_building_trigger
    AFTER INSERT ON fast_housing
    FOR EACH ROW
    WHEN (NEW.building_id IS NOT NULL)
    EXECUTE FUNCTION update_building_stats();

    -- Trigger pour UPDATE
    CREATE TRIGGER housing_update_building_trigger
    AFTER UPDATE OF building_id, occupancy ON fast_housing
    FOR EACH ROW
    WHEN (OLD.building_id IS DISTINCT FROM NEW.building_id OR
          OLD.occupancy IS DISTINCT FROM NEW.occupancy)
    EXECUTE FUNCTION update_building_stats();

    -- Trigger pour DELETE
    CREATE TRIGGER housing_delete_building_trigger
    AFTER DELETE ON fast_housing
    FOR EACH ROW
    WHEN (OLD.building_id IS NOT NULL)
    EXECUTE FUNCTION update_building_stats();
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TRIGGER IF EXISTS housing_insert_building_trigger ON fast_housing;
    DROP TRIGGER IF EXISTS housing_update_building_trigger ON fast_housing;
    DROP TRIGGER IF EXISTS housing_delete_building_trigger ON fast_housing;
    DROP FUNCTION IF EXISTS update_building_stats();
  `);
}
