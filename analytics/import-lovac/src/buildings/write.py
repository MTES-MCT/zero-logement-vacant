import io

import polars as pl
import psycopg


STAGING_COLUMNS = ["id", "rnb_id", "rnb_id_score", "rnb_footprint", "housing_count", "vacant_housing_count"]


def _copy_to_staging(
    dataframe: pl.DataFrame,
    staging_table: str,
    columns: list[str],
    cursor: psycopg.Cursor,
) -> None:
    """COPY a DataFrame into a staging table using psycopg's COPY protocol."""
    buffer = io.BytesIO()
    dataframe.select(columns).write_csv(buffer)
    buffer.seek(0)
    columns_clause = ", ".join(f'"{column}"' for column in columns)
    with cursor.copy(f"COPY {staging_table} ({columns_clause}) FROM STDIN WITH (FORMAT csv, HEADER true)") as copy:
        copy.write(buffer.read())


def write_source_buildings(
    source: pl.DataFrame,
    connection_string: str,
    dry_run: bool = False,
) -> int:
    """Insert new buildings from source data. Skip existing ones.

    Returns the number of buildings inserted.
    """
    if dry_run:
        source.write_ndjson("dry-run-buildings-create.jsonl")
        return source.height

    if source.height == 0:
        return 0

    to_insert = source.select(
        pl.col("building_id").alias("id"),
        pl.col("rnb_id"),
        pl.col("rnb_id_score"),
        pl.col("rnb_footprint"),
        pl.lit(0).alias("housing_count"),
        pl.lit(0).alias("vacant_housing_count"),
    )

    with psycopg.connect(connection_string) as connection:
        with connection.cursor() as cursor:
            cursor.execute(
                "CREATE TEMP TABLE stg_buildings (LIKE buildings INCLUDING DEFAULTS)"
            )
            _copy_to_staging(to_insert, "stg_buildings", STAGING_COLUMNS, cursor)
            columns = ", ".join(STAGING_COLUMNS)
            cursor.execute(f"""
                INSERT INTO buildings ({columns})
                SELECT {columns} FROM stg_buildings
                ON CONFLICT (id) DO NOTHING
            """)
            inserted = cursor.rowcount
            cursor.execute("DROP TABLE stg_buildings")
        connection.commit()

    return inserted


def update_building_counts(connection_string: str, dry_run: bool = False) -> int:
    """Recompute rent and vacant housing counts for all buildings.

    Mirrors the TypeScript source-housing-command.ts bulk UPDATE.

    Returns the number of buildings updated.
    """
    if dry_run:
        return 0

    with psycopg.connect(connection_string) as connection:
        with connection.cursor() as cursor:
            cursor.execute("""
                WITH building_counts AS (
                    SELECT
                        building_id,
                        COUNT(*) FILTER (WHERE occupancy = 'L') AS rent_count,
                        COUNT(*) FILTER (WHERE occupancy = 'V') AS vacant_count
                    FROM fast_housing
                    WHERE building_id IS NOT NULL
                    GROUP BY building_id
                )
                UPDATE buildings b
                SET
                    rent_housing_count = COALESCE(bc.rent_count, 0),
                    vacant_housing_count = COALESCE(bc.vacant_count, 0)
                FROM building_counts bc
                WHERE b.id = bc.building_id
            """)
            updated = cursor.rowcount
        connection.commit()

    return updated
