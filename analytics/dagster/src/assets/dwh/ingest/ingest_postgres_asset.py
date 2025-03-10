from dagster import AssetKey, asset
from dagster_duckdb import DuckDBResource
from dagster import AssetExecutionContext, AssetSpec, MaterializeResult, multi_asset
from ....config import Config
from .queries.production import production_tables


# Liste des tables et leurs commandes SQL pour remplir DuckDB


@asset(
    name="setup_connection_replica_production_table",
    description="Load all tables into DuckDB",
    group_name="sync_production",
    compute_kind="duckdb",
    deps=["setup_duckdb"],
)
def setup_replica_db(context, duckdb: DuckDBResource):
    attach_query = f"ATTACH IF NOT EXISTS 'dbname={Config.POSTGRES_PRODUCTION_DB_NAME} user={Config.POSTGRES_PRODUCTION_READONLY_USER} password={Config.POSTGRES_PRODUCTION_READONLY_PASSWORD} host={Config.POSTGRES_PRODUCTION_DB} port={Config.POSTGRES_PRODUCTION_PORT}' AS zlv_replication_db (TYPE POSTGRES, READ_ONLY);"

    with duckdb.get_connection() as conn:
        context.log.info(f"Executing SQL: {attach_query}")
        conn.execute(attach_query)
        schema_query = "CREATE SCHEMA  IF NOT EXISTS production;"
        context.log.info(f"Executing SQL: {schema_query}")
        conn.execute(schema_query)
        s3_query = f"""
            CREATE OR REPLACE PERSISTENT SECRET SECRET (
                TYPE S3,
                KEY_ID '{Config.CELLAR_ACCESS_KEY_ID}',
                SECRET '{Config.CELLAR_SECRET_ACCESS_KEY}',
                ENDPOINT '{Config.CELLAR_HOST_URL}',
                REGION '{Config.CELLAR_REGION}'
            );
        """
        context.log.info(f"Executing SQL: {s3_query}")
        conn.execute(s3_query)


def process_subset(name: str, context: AssetExecutionContext, duckdb: DuckDBResource):
    with duckdb.get_connection() as conn:
        attach_query = f"ATTACH IF NOT EXISTS 'dbname={Config.POSTGRES_PRODUCTION_DB_NAME} user={Config.POSTGRES_PRODUCTION_READONLY_USER} password={Config.POSTGRES_PRODUCTION_READONLY_PASSWORD} host={Config.POSTGRES_PRODUCTION_DB} port={Config.POSTGRES_PRODUCTION_PORT}' AS zlv_replication_db (TYPE POSTGRES, READ_ONLY);"
        context.log.info(f"Executing SQL: {attach_query}")
        conn.execute(attach_query)
        command = production_tables[name]
        context.log.info(f"Executing SQL: {command}")
        res = conn.execute(command)
        context.log.info(f"Result: {res.fetchdf()}")


@multi_asset(
    specs=[
        AssetSpec(
            f"raw_{name}",
            deps=["setup_connection_replica_production_table"],
            kinds={"duckdb"},
            group_name="sync_production",
        )
        for name in production_tables
    ],
    can_subset=True,
)
def import_postgres_data_from_replica_to_duckdb(
    context: AssetExecutionContext, duckdb: DuckDBResource
):
    context.log.info("Importing data from replica to DuckDB")
    context.log.info("duckdb: " + duckdb.__str__())
    for name in production_tables:
        if AssetKey(f"raw_{name}") in context.op_execution_context.selected_asset_keys:
            context.log.info(f"Found {name} in selected_asset_keys")
            process_subset(name, context, duckdb)
            yield MaterializeResult(asset_key=f"raw_{name}")
        else:
            pass
