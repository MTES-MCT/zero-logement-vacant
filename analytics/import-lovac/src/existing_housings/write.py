import polars as pl
import psycopg


BATCH_SIZE = 10_000


def _copy_dataframe(cursor, dataframe: pl.DataFrame, table: str) -> None:
    """COPY a Polars DataFrame into a table via psycopg's COPY protocol."""
    columns = ", ".join(dataframe.columns)
    with cursor.copy(f"COPY {table} ({columns}) FROM STDIN") as copy:
        for row in dataframe.iter_rows():
            copy.write_row(row)


def write_existing_housing_updates(
    to_update: pl.DataFrame,
    events: pl.DataFrame,
    housing_events: pl.DataFrame,
    connection_string: str,
    dry_run: bool = False,
) -> tuple[int, int]:
    """Write housing status resets and events to PostgreSQL.

    - to_update: UPDATE occupancy/status via batched UPDATE ... FROM
    - events: INSERT into events table with ON CONFLICT DO NOTHING
    - housing_events: INSERT into housing_events join table with ON CONFLICT DO NOTHING

    Returns (updated_count, events_count).
    """
    if dry_run:
        to_update.write_ndjson("dry-run-existing-housings-update.jsonl")
        events.write_ndjson("dry-run-existing-housings-events.jsonl")
        return to_update.height, events.height

    updated = 0
    events_inserted = 0

    with psycopg.connect(connection_string) as connection:
        if to_update.height > 0:
            identifiers = to_update["id"].to_list()
            with connection.cursor() as cursor:
                cursor.execute(
                    "CREATE TEMP TABLE stg_existing_housings (LIKE fast_housing INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, to_update, "stg_existing_housings")
            for offset in range(0, len(identifiers), BATCH_SIZE):
                batch = identifiers[offset : offset + BATCH_SIZE]
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE fast_housing SET
                            occupancy = s.occupancy,
                            status = s.status,
                            sub_status = s.sub_status,
                            updated_at = now()
                        FROM stg_existing_housings s
                        WHERE fast_housing.id = s.id
                          AND fast_housing.id = ANY(%s)
                    """, (batch,))
                    updated += cursor.rowcount
                connection.commit()

            with connection.cursor() as cursor:
                cursor.execute("DROP TABLE IF EXISTS stg_existing_housings")
            connection.commit()

        if events.height > 0:
            with connection.cursor() as cursor:
                cursor.execute(
                    "CREATE TEMP TABLE stg_eh_events (LIKE events INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, events, "stg_eh_events")
                cursor.execute("""
                    INSERT INTO events
                    SELECT * FROM stg_eh_events
                    ON CONFLICT (id) DO NOTHING
                """)
                events_inserted = cursor.rowcount
                cursor.execute("DROP TABLE stg_eh_events")

                cursor.execute(
                    "CREATE TEMP TABLE stg_eh_housing_events (LIKE housing_events INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, housing_events, "stg_eh_housing_events")
                cursor.execute("""
                    INSERT INTO housing_events
                    SELECT * FROM stg_eh_housing_events
                    ON CONFLICT DO NOTHING
                """)
                cursor.execute("DROP TABLE stg_eh_housing_events")
            connection.commit()

    return updated, events_inserted
