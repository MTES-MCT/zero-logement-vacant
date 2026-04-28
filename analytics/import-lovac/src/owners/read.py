import polars as pl

SOURCE_OWNER_SCHEMA = {
    "owner_uid": pl.Utf8,
    "idpersonne": pl.Utf8,
    "full_name": pl.Utf8,
    "username": pl.Utf8,
    "dgfip_address": pl.Utf8,
    "ownership_type": pl.Utf8,
    "birth_date": pl.Utf8,
    "siren": pl.Utf8,
    "entity": pl.Utf8,  # raw: null or "0"-"9" or "0A" — mapped in transform
}


def read_source_owners(path: str) -> pl.LazyFrame:
    """Read LOVAC owner JSONL file with explicit schema."""
    return pl.scan_ndjson(path, schema=SOURCE_OWNER_SCHEMA)


def validate_source_owners(lazy_frame: pl.LazyFrame) -> pl.LazyFrame:
    """Validate source owners — mirrors sourceOwnerSchema (Zod).

    Filters out invalid rows and enforces constraints:
    - idpersonne: required, non-empty string
    - full_name: required, non-empty string
    - ownership_type: required, non-empty string
    - siren: nullable, must match ^\d{9}$ if present
    - entity: enforced by Enum type at read time
    """
    return lazy_frame.filter(
        pl.col("idpersonne").str.strip_chars().str.len_chars() > 0
    ).filter(
        pl.col("full_name").str.strip_chars().str.len_chars() > 0
    ).filter(
        pl.col("ownership_type").str.strip_chars().str.len_chars() > 0
    ).filter(
        pl.col("siren").is_null() | pl.col("siren").str.contains(r"^\d{9}$")
    ).with_columns(
        pl.col("idpersonne").str.strip_chars(),
        pl.col("full_name").str.strip_chars(),
        pl.col("username").str.strip_chars(),
        pl.col("dgfip_address").str.strip_chars(),
        pl.col("siren").str.strip_chars(),
    )


def read_existing_owners(connection_string: str) -> pl.DataFrame:
    """Read existing owners from PostgreSQL (only columns needed for join)."""
    return pl.read_database_uri(
        "SELECT id, idpersonne, data_source FROM owners",
        connection_string,
    )
