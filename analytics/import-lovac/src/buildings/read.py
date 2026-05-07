import polars as pl


SOURCE_BUILDINGS_SCHEMA = {
    "building_id": pl.Utf8,
    "rnb_id": pl.Utf8,
    "rnb_id_score": pl.Int64,
    "rnb_footprint": pl.Int64,
}


def read_source_buildings(path: str) -> pl.DataFrame:
    """Read source buildings from a JSONL file."""
    return pl.read_ndjson(path, schema=SOURCE_BUILDINGS_SCHEMA)


def count_existing_buildings(connection_string: str) -> int:
    """Count existing buildings in PostgreSQL (for reporting)."""
    result = pl.read_database_uri(
        "SELECT COUNT(*)::BIGINT AS n FROM buildings",
        connection_string,
    )
    return result["n"][0]
