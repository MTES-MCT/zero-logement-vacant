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
                            AND geo_code = substring(OLD.building_id for 5)
                        ),
                        vacant_housing_count = (
                            SELECT COUNT(*)
                            FROM fast_housing
                            WHERE building_id = OLD.building_id
                            AND occupancy = 'V'
                            AND geo_code = substring(OLD.building_id for 5)
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
                        AND geo_code = substring(building for 5)
                    ),
                    vacant_housing_count = (
                        SELECT COUNT(*)
                        FROM fast_housing
                        WHERE building_id = building
                        AND occupancy = 'V'
                        AND geo_code = substring(building for 5)
                    )
                WHERE id = building;
            END IF;
        END;

        RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;
  `);
}

export async function down(): Promise<void> {}
