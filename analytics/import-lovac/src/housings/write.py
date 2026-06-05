import polars as pl
import psycopg


BATCH_SIZE = 10_000

# Columns to INSERT into fast_housing (excludes read-only: plot_area, occupancy_history, last_mutation_type)
HOUSING_COLUMNS = [
    "id", "invariant", "local_id", "building_id", "building_group_id",
    "address_dgfip", "geo_code", "longitude_dgfip", "latitude_dgfip",
    "cadastral_classification", "uncomfortable", "vacancy_start_year",
    "housing_kind", "rooms_count", "living_area", "cadastral_reference",
    "building_year", "mutation_date", "taxed", "data_years",
    "beneficiary_count", "building_location", "rental_value", "condominium",
    "status", "sub_status", "actual_dpe", "energy_consumption_bdnb",
    "energy_consumption_at_bdnb", "occupancy_source", "occupancy",
    "occupancy_intended", "plot_id", "data_source", "data_file_years",
    "geolocation", "geolocation_source", "last_mutation_date",
    "last_transaction_date", "last_transaction_value",
]

# Columns to UPDATE on existing housings
UPDATE_COLUMNS = [
    "invariant", "building_id", "building_group_id", "plot_id",
    "address_dgfip", "longitude_dgfip", "latitude_dgfip",
    "geolocation", "geolocation_source", "cadastral_classification",
    "uncomfortable", "vacancy_start_year", "housing_kind", "rooms_count",
    "living_area", "cadastral_reference", "building_year", "mutation_date",
    "last_mutation_date", "last_transaction_date", "last_transaction_value",
    "taxed", "data_years", "data_file_years", "data_source",
    "beneficiary_count", "building_location", "rental_value", "condominium",
    "status", "sub_status", "occupancy", "occupancy_source",
    "occupancy_intended", "energy_consumption_bdnb",
    "energy_consumption_at_bdnb",
]


def _copy_dataframe(cursor, dataframe: pl.DataFrame, table: str) -> None:
    """COPY a Polars DataFrame into a table via psycopg's COPY protocol."""
    columns = ", ".join(dataframe.columns)
    with cursor.copy(f"COPY {table} ({columns}) FROM STDIN") as copy:
        for row in dataframe.iter_rows():
            copy.write_row(row)


def write_housings(
    to_create: pl.DataFrame,
    to_update: pl.DataFrame,
    events: pl.DataFrame,
    housing_events: pl.DataFrame,
    connection_string: str,
    dry_run: bool = False,
) -> tuple[int, int, int]:
    """Write housings and events to PostgreSQL.

    Returns (created_count, updated_count, events_count).
    """
    if dry_run:
        to_create.write_ndjson("dry-run-housings-create.jsonl")
        to_update.write_ndjson("dry-run-housings-update.jsonl")
        events.write_ndjson("dry-run-housings-events.jsonl")
        return to_create.height, to_update.height, events.height

    created = 0
    updated = 0
    events_inserted = 0

    with psycopg.connect(connection_string) as connection:
        # Insert new housings
        if to_create.height > 0:
            create_subset = to_create.select(HOUSING_COLUMNS)
            with connection.cursor() as cursor:
                cursor.execute(
                    "CREATE TEMP TABLE stg_housings_create (LIKE fast_housing INCLUDING DEFAULTS) ON COMMIT DROP"
                )
                _copy_dataframe(cursor, create_subset, "stg_housings_create")
                columns = ", ".join(HOUSING_COLUMNS)
                cursor.execute(f"""
                    INSERT INTO fast_housing ({columns})
                    SELECT {columns} FROM stg_housings_create
                    ON CONFLICT (local_id, geo_code) DO NOTHING
                """)
                created = cursor.rowcount
            connection.commit()

        # Update existing housings in batches
        if to_update.height > 0:
            identifiers = to_update["id"].to_list()
            update_subset = to_update.select(["id", "geo_code"] + UPDATE_COLUMNS)
            with connection.cursor() as cursor:
                cursor.execute(
                    "CREATE TEMP TABLE stg_housings_update (LIKE fast_housing INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, update_subset, "stg_housings_update")
            set_clause = ", ".join(f"{col} = s.{col}" for col in UPDATE_COLUMNS)
            for offset in range(0, len(identifiers), BATCH_SIZE):
                batch = identifiers[offset : offset + BATCH_SIZE]
                with connection.cursor() as cursor:
                    cursor.execute(f"""
                        UPDATE fast_housing SET
                            {set_clause},
                            updated_at = now()
                        FROM stg_housings_update s
                        WHERE fast_housing.id = s.id
                          AND fast_housing.id = ANY(%s)
                    """, (batch,))
                    updated += cursor.rowcount
                connection.commit()

            with connection.cursor() as cursor:
                cursor.execute("DROP TABLE IF EXISTS stg_housings_update")
            connection.commit()

        # Insert events into both events + housing_events tables
        if events.height > 0:
            with connection.cursor() as cursor:
                cursor.execute(
                    "CREATE TEMP TABLE stg_events (LIKE events INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, events, "stg_events")
                cursor.execute("""
                    INSERT INTO events
                    SELECT * FROM stg_events
                    ON CONFLICT (id) DO NOTHING
                """)
                events_inserted = cursor.rowcount
                cursor.execute("DROP TABLE stg_events")

                cursor.execute(
                    "CREATE TEMP TABLE stg_housing_events (LIKE housing_events INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, housing_events, "stg_housing_events")
                cursor.execute("""
                    INSERT INTO housing_events
                    SELECT * FROM stg_housing_events
                    ON CONFLICT DO NOTHING
                """)
                cursor.execute("DROP TABLE stg_housing_events")
            connection.commit()

    return created, updated, events_inserted
