import psycopg


BUILDING_TRIGGERS = [
    "housing_insert_building_trigger",
    "housing_update_building_trigger",
    "housing_delete_building_trigger",
]


def disable_building_triggers(connection_string: str) -> None:
    """Disable building count triggers on fast_housing for bulk import performance."""
    with psycopg.connect(connection_string) as connection:
        with connection.cursor() as cursor:
            for trigger in BUILDING_TRIGGERS:
                cursor.execute(
                    f"ALTER TABLE fast_housing DISABLE TRIGGER {trigger}"
                )
        connection.commit()


def enable_building_triggers(connection_string: str) -> None:
    """Re-enable building count triggers on fast_housing after bulk import."""
    with psycopg.connect(connection_string) as connection:
        with connection.cursor() as cursor:
            for trigger in BUILDING_TRIGGERS:
                cursor.execute(
                    f"ALTER TABLE fast_housing ENABLE TRIGGER {trigger}"
                )
        connection.commit()
