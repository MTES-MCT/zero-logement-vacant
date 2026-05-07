import polars as pl


def read_housings_missing_from_year(
    connection_string: str, year: str, department: str
) -> pl.DataFrame:
    """Read housings that are vacant but missing from the current LOVAC year.

    These housings may have left vacancy and need their status reset.
    """
    return pl.read_database_uri(
        f"""
        SELECT id, local_id, geo_code, occupancy, status, sub_status, data_file_years
        FROM fast_housing
        WHERE geo_code LIKE '{department}%'
          AND occupancy = 'V'
          AND status IN (0, 1)
          AND NOT ('{year}' = ANY(data_file_years))
        """,
        connection_string,
    )
