from dagster import MaterializeResult, asset
from dagster_duckdb import DuckDBResource
from ...config import Config


@asset(
    name="setup_duckdb",
    description="Setup Duckdb",
    group_name="setup",
    compute_kind="duckdb",
)
def setup_duckdb(context, duckdb: DuckDBResource):
    context.log.info(f"Config.USE_MOTHER_DUCK{Config.USE_MOTHER_DUCK}")

    if not Config.USE_MOTHER_DUCK:
        SETUP_QUERY = f"""
            SET memory_limit = '{Config.DUCKDB_MEMORY_LIMIT}GB';
            SET threads TO {Config.DUCKDB_THREAD_NUMBER};
            CREATE OR REPLACE PERSISTENT SECRET SECRET (
                TYPE S3,
                KEY_ID '{Config.CELLAR_ACCESS_KEY_ID}',
                SECRET '{Config.CELLAR_SECRET_ACCESS_KEY}',
                ENDPOINT '{Config.CELLAR_HOST_URL}',
                REGION '{Config.CELLAR_REGION}'
            );
        """

        with duckdb.get_connection() as conn:
            context.log.info(f"Executing SQL: {SETUP_QUERY}")
            conn.execute(SETUP_QUERY)
            
        return "DuckDB setup successfully"
    else:
        return "Mother Duck is used, no need to setup DuckDB"
