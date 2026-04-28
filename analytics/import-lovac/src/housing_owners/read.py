import polars as pl

# Mirrors PropertyRight from @zerologementvacant/models
PROPERTY_RIGHT_VALUES = [
    "proprietaire-entier",
    "usufruitier",
    "nu-proprietaire",
    "administrateur",
    "syndic",
    "associe-sci-ir",
    "autre",
]

# Mirrors ActiveOwnerRank from @zerologementvacant/models
ACTIVE_OWNER_RANKS = [1, 2, 3, 4, 5, 6]

SOURCE_HOUSING_OWNER_SCHEMA = {
    "owner_uid": pl.Utf8,
    "geo_code": pl.Utf8,
    "local_id": pl.Utf8,
    "idpersonne": pl.Utf8,
    "idprocpte": pl.Utf8,
    "idprodroit": pl.Utf8,
    "locprop_source": pl.Int64,
    "property_right": pl.Enum(PROPERTY_RIGHT_VALUES),
    "rank": pl.Int32,
}


def read_source_housing_owners(path: str, department: str) -> pl.LazyFrame:
    """Read LOVAC housing-owner JSONL file, filtered by department."""
    return pl.scan_ndjson(path, schema=SOURCE_HOUSING_OWNER_SCHEMA).filter(
        pl.col("geo_code").str.starts_with(department)
    )


def validate_source_housing_owners(lazy_frame: pl.LazyFrame) -> pl.LazyFrame:
    """Validate source housing-owners — mirrors sourceHousingOwnerSchema (Zod).

    Filters out invalid rows and enforces constraints:
    - geo_code: exactly 5 characters
    - local_id: exactly 12 characters
    - idpersonne: exactly 8 characters
    - idprocpte: exactly 11 characters
    - idprodroit: exactly 13 characters
    - rank: must be in ACTIVE_OWNER_RANKS
    - property_right: enforced by Enum type at read time
    """
    return lazy_frame.filter(
        (pl.col("geo_code").str.len_chars() == 5)
        & (pl.col("local_id").str.len_chars() == 12)
        & (pl.col("idpersonne").str.len_chars() == 8)
        & (pl.col("idprocpte").str.len_chars() == 11)
        & (pl.col("idprodroit").str.len_chars() == 13)
        & (pl.col("rank").is_in(ACTIVE_OWNER_RANKS))
    )


def read_existing_housings_for_join(
    connection_string: str, department: str
) -> pl.DataFrame:
    """Read existing housings (id + local_id + geo_code) for the department."""
    return pl.read_database_uri(
        f"""
        SELECT id, local_id, geo_code
        FROM fast_housing
        WHERE geo_code LIKE '{department}%'
        """,
        connection_string,
    )


def read_existing_owners_for_join(connection_string: str) -> pl.DataFrame:
    """Read existing owner IDs for join.

    Note: owners are not partitioned by department — one owner can own
    properties across departments. We read all owners but only the id
    column needed for the join.
    """
    return pl.read_database_uri(
        "SELECT id FROM owners",
        connection_string,
    )


def read_existing_housing_owners(
    connection_string: str, housing_ids: list[str]
) -> pl.DataFrame:
    """Read existing housing-owner links for a set of housings."""
    if not housing_ids:
        return pl.DataFrame(schema={
            "housing_id": pl.Utf8,
            "owner_id": pl.Utf8,
            "rank": pl.Int32,
            "start_date": pl.Date,
            "end_date": pl.Date,
        })
    ids_literal = ", ".join(f"'{id}'" for id in housing_ids)
    return pl.read_database_uri(
        f"""
        SELECT housing_id, owner_id, rank, start_date, end_date
        FROM owners_housing
        WHERE housing_id IN ({ids_literal})
        """,
        connection_string,
    )
