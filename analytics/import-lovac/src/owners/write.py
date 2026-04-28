import io

import polars as pl
import psycopg


BATCH_SIZE = 10_000

# Source → DB column renames
COLUMN_RENAMES = {
    "dgfip_address": "address_dgfip",
    "entity": "kind_class",
}

# DB columns to COPY into the staging table (after rename)
STAGING_COLUMNS = [
    "id", "idpersonne", "full_name", "username", "address_dgfip",
    "birth_date", "siren", "kind_class", "data_source",
]


def _rename_to_db_columns(dataframe: pl.DataFrame) -> pl.DataFrame:
    """Rename source columns to match the owners DB schema."""
    return dataframe.rename(COLUMN_RENAMES)


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


def write_owners(
    to_create: pl.DataFrame,
    to_update: pl.DataFrame,
    connection_string: str,
    dry_run: bool = False,
) -> tuple[int, int]:
    """Write owners to PostgreSQL.

    - to_create: INSERT new owners (upsert via ON CONFLICT for safety)
    - to_update: UPDATE existing owners only (never insert)

    Returns (created_count, updated_count).
    """
    if dry_run:
        to_create.write_ndjson("dry-run-owners-create.jsonl")
        to_update.write_ndjson("dry-run-owners-update.jsonl")
        return to_create.height, to_update.height

    created = 0
    updated = 0

    with psycopg.connect(connection_string) as connection:
        if to_create.height > 0:
            renamed = _rename_to_db_columns(to_create)
            with connection.cursor() as cursor:
                cursor.execute("CREATE TEMP TABLE stg_owners_create (LIKE owners INCLUDING DEFAULTS)")
                _copy_to_staging(renamed, "stg_owners_create", STAGING_COLUMNS, cursor)
                cursor.execute("""
                    INSERT INTO owners (id, idpersonne, full_name, username, address_dgfip, birth_date, siren, kind_class, data_source)
                    SELECT id, idpersonne, full_name, username, address_dgfip, birth_date, siren, kind_class, data_source
                    FROM stg_owners_create
                    ON CONFLICT (id) DO NOTHING
                """)
                created = cursor.rowcount
                cursor.execute("DROP TABLE stg_owners_create")
            connection.commit()

        if to_update.height > 0:
            renamed = _rename_to_db_columns(to_update)
            with connection.cursor() as cursor:
                cursor.execute("CREATE TEMP TABLE stg_owners_update (LIKE owners INCLUDING DEFAULTS)")
                _copy_to_staging(renamed, "stg_owners_update", STAGING_COLUMNS, cursor)

            identifiers = to_update["idpersonne"].to_list()
            for offset in range(0, len(identifiers), BATCH_SIZE):
                batch = identifiers[offset : offset + BATCH_SIZE]
                with connection.cursor() as cursor:
                    cursor.execute("""
                        UPDATE owners SET
                            id = s.id,
                            full_name = s.full_name,
                            username = s.username,
                            birth_date = s.birth_date,
                            siren = s.siren,
                            address_dgfip = s.address_dgfip,
                            kind_class = s.kind_class,
                            data_source = s.data_source,
                            updated_at = now()
                        FROM stg_owners_update s
                        WHERE owners.idpersonne = s.idpersonne
                          AND owners.idpersonne = ANY(%s)
                    """, (batch,))
                    updated += cursor.rowcount
                connection.commit()

            with connection.cursor() as cursor:
                cursor.execute("DROP TABLE IF EXISTS stg_owners_update")
            connection.commit()

    return created, updated
