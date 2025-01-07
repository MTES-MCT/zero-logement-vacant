from dagster import asset
from dagster_duckdb import DuckDBResource
from .config import Config


@asset(
    name="setup_duckdb",
    description="Setup Duckdb",
    group_name="setup",
    compute_kind="duckdb",
)
def setup_duckdb(context, duckdb: DuckDBResource):
    SETUP_QUERY = f"SET memory_limit = '{Config.DUCKDB_MEMORY_LIMIT}GB';"

    with duckdb.get_connection() as conn:
        context.log.info(f"Executing SQL: {SETUP_QUERY}")
        conn.execute(SETUP_QUERY)
