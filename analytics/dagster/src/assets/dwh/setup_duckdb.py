from dagster import AssetKey, asset
from dagster_duckdb import DuckDBResource
from dagster import AssetExecutionContext, AssetSpec, MaterializeResult, multi_asset
from .config import Config
from .queries.production import production_tables




@asset(name="setup_duckdb",
        description="Setup Duckdb", group_name="setup", 
        compute_kind="duckdb")
def setup_replica_db(context, duckdb: DuckDBResource):
    SETUP_QUERY = f"SET memory_limit = '{Config.DUCKDB_MEMORY_LIMIT}GB';"

    with duckdb.get_connection() as conn:
        context.log.info(f"Executing SQL: {SETUP_QUERY}")
        conn.execute(SETUP_QUERY)