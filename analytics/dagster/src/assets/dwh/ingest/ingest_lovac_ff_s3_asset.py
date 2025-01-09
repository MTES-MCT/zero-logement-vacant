from dagster import AssetKey, asset
from dagster_duckdb import DuckDBResource
from dagster import AssetExecutionContext, AssetSpec, MaterializeResult, multi_asset
from ....config import Config
from .queries.lovac import lovac_tables_sql
from .queries.ff import ff_tables_sql


all_tables_sql = {**lovac_tables_sql, **ff_tables_sql}


@asset(name="setup_s3_connection", description="Load all tables into DuckDB")
def setup_s3_connection(context, duckdb: DuckDBResource):
    query = f"""
        CREATE OR REPLACE PERSISTENT SECRET SECRET (
            TYPE S3,
            KEY_ID '{Config.CELLAR_ACCESS_KEY_ID}',
            SECRET '{Config.CELLAR_SECRET_ACCESS_KEY}',
            ENDPOINT '{Config.CELLAR_HOST_URL}',
            REGION '{Config.CELLAR_REGION}'
        );
    """
    with duckdb.get_connection() as conn:
        context.log.info(f"Executing SQL: {query}")
        conn.execute(query)
        schema_query = """
            CREATE SCHEMA IF NOT EXISTS ff;
            CREATE SCHEMA IF NOT EXISTS lovac;
        """
        context.log.info(f"Executing SQL: {schema_query}")
        conn.execute(schema_query)


def process_subset(name: str, context: AssetExecutionContext, duckdb: DuckDBResource):
    with duckdb.get_connection() as conn:

        command = all_tables_sql[name]
        context.log.info(f"Executing SQL: {command}")
        res = conn.execute(command)
        context.log.info(f"Result: {res.fetchdf()}")


@multi_asset(
    specs=[
        AssetSpec(
            f"build_{name}",
            deps=["setup_s3_connection"],
            kinds={"duckdb", "s3"},
            group_name="lovac" if "lovac" in name else "ff",
        )
        for name in all_tables_sql
    ],
    can_subset=True,
)
def import_cerema_ff_lovac_data_from_s3_to_duckdb(
    context: AssetExecutionContext, duckdb: DuckDBResource
):
    context.log.info("Importing data from replica to DuckDB")
    context.log.info("duckdb: " + duckdb.__str__())
    for name in all_tables_sql:
        if AssetKey(f"build_{name}") in context.op_execution_context.selected_asset_keys:
            context.log.info(f"Found {name} in selected_asset_keys")
            process_subset(name, context, duckdb)
            yield MaterializeResult(asset_key=f"build_{name}")
        else:
            pass
