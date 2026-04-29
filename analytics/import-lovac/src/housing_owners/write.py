import polars as pl
import psycopg


def _copy_dataframe(cursor, dataframe: pl.DataFrame, table: str) -> None:
    """COPY a Polars DataFrame into a table via psycopg's COPY protocol."""
    columns = ", ".join(dataframe.columns)
    with cursor.copy(f"COPY {table} ({columns}) FROM STDIN") as copy:
        for row in dataframe.iter_rows():
            copy.write_row(row)


def write_housing_owners(
    housing_owner_rows: pl.DataFrame,
    events: pl.DataFrame,
    housing_owner_events: pl.DataFrame,
    connection_string: str,
    dry_run: bool = False,
) -> tuple[int, int]:
    """Write housing-owner links and events to PostgreSQL.

    Replaces the entire housing-owner set per housing (DELETE + INSERT).

    Returns (links_written, events_count).
    """
    if dry_run:
        housing_owner_rows.write_ndjson("dry-run-housing-owners.jsonl")
        events.write_ndjson("dry-run-housing-owner-events.jsonl")
        return housing_owner_rows.height, events.height

    links_written = 0
    events_inserted = 0

    with psycopg.connect(connection_string) as connection:
        if housing_owner_rows.height > 0:
            housing_ids = housing_owner_rows["housing_id"].unique().to_list()

            with connection.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM owners_housing WHERE housing_id = ANY(%s)",
                    (housing_ids,),
                )
                cursor.execute(
                    "CREATE TEMP TABLE stg_housing_owners (LIKE owners_housing INCLUDING DEFAULTS) ON COMMIT DROP"
                )
                _copy_dataframe(cursor, housing_owner_rows, "stg_housing_owners")
                cursor.execute("""
                    INSERT INTO owners_housing
                    SELECT * FROM stg_housing_owners
                """)
                links_written = cursor.rowcount
            connection.commit()

        if events.height > 0:
            with connection.cursor() as cursor:
                cursor.execute(
                    "CREATE TEMP TABLE stg_ho_events (LIKE events INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, events, "stg_ho_events")
                cursor.execute("""
                    INSERT INTO events
                    SELECT * FROM stg_ho_events
                    ON CONFLICT (id) DO NOTHING
                """)
                events_inserted = cursor.rowcount
                cursor.execute("DROP TABLE stg_ho_events")

                cursor.execute(
                    "CREATE TEMP TABLE stg_ho_join_events (LIKE housing_owner_events INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, housing_owner_events, "stg_ho_join_events")
                cursor.execute("""
                    INSERT INTO housing_owner_events
                    SELECT * FROM stg_ho_join_events
                    ON CONFLICT DO NOTHING
                """)
                cursor.execute("DROP TABLE stg_ho_join_events")
            connection.commit()

    return links_written, events_inserted
