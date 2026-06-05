import polars as pl


def read_source_housings(path: str, department: str) -> pl.LazyFrame:
    """Read LOVAC housing parquet files for a single department."""
    return pl.scan_parquet(
        f"{path}/**/*.parquet",
        hive_partitioning=True,
    ).filter(pl.col("dept") == department)


def read_existing_housings(connection_string: str, department: str) -> pl.DataFrame:
    """Read existing housings for a department from PostgreSQL."""
    return pl.read_database_uri(
        f"""
        SELECT id, local_id, geo_code, occupancy, status, sub_status, data_file_years
        FROM fast_housing
        WHERE geo_code LIKE '{department}%'
        """,
        connection_string,
    )


def read_existing_housing_events(
    connection_string: str, housing_ids: list[str]
) -> pl.DataFrame:
    """Read relevant events for a set of housings."""
    if not housing_ids:
        return pl.DataFrame(schema={
            "housing_id": pl.Utf8,
            "type": pl.Utf8,
            "created_by": pl.Utf8,
            "created_at": pl.Datetime,
        })
    ids_literal = ", ".join(f"'{id}'" for id in housing_ids)
    return pl.read_database_uri(
        f"""
        SELECT he.housing_id, e.type, e.created_by, e.created_at
        FROM housing_events he
        JOIN events e ON e.id = he.event_id
        WHERE he.housing_id IN ({ids_literal})
          AND e.type IN ('housing:occupancy-updated', 'housing:status-updated')
        """,
        connection_string,
    )


def read_admin_user_id(connection_string: str, email: str) -> str:
    """Look up the admin user id by email."""
    result = pl.read_database_uri(
        f"SELECT id FROM users WHERE email = '{email}' LIMIT 1",
        connection_string,
    )
    if result.height == 0:
        raise ValueError(f"No user found with email: {email}")
    return result["id"][0]
