from dagster import AssetKey
from ....config import RESULT_TABLES, Config, translate_table_name
from dagster_duckdb import DuckDBResource
from dagster import AssetExecutionContext, AssetSpec, MaterializeResult, multi_asset


source_schema = "main_marts"
destination_schema = "main"


def process_specific_table(context, table_name: str, duckdb: DuckDBResource, duckdb_metabase: DuckDBResource):
    source_db = duckdb.database
    chemin_destination_db = duckdb_metabase.database

    context.log.info(f"source_db: {source_db}")
    context.log.info(f"chemin_destination_db: {chemin_destination_db}")

    SETUP_SECRET_QUERY = f"""
        CREATE OR REPLACE PERSISTENT SECRET SECRET (
            TYPE S3,
            KEY_ID '{Config.CELLAR_ACCESS_KEY_ID}',
            SECRET '{Config.CELLAR_SECRET_ACCESS_KEY}',
            ENDPOINT '{Config.CELLAR_HOST_URL}',
            REGION '{Config.CELLAR_REGION}'
        );
    """

    source_table_name = table_name
    destination_table_name = translate_table_name(table_name)
    with duckdb.get_connection() as source_conn:
        COPY_QUERY = f"COPY {source_schema}.{source_table_name} TO 's3://{Config.CELLAR_METABASE_BUCKET_NAME}/data/{destination_table_name}.parquet';"
        context.log.info(f"Executing SQL: {COPY_QUERY}")
        source_conn.execute(COPY_QUERY)

    with duckdb_metabase.get_connection() as destination_conn:
        context.log.info(f"Executing SQL: {SETUP_SECRET_QUERY}")
        destination_conn.execute(SETUP_SECRET_QUERY)

        COPY_QUERY = f"CREATE OR REPLACE TABLE {destination_table_name} AS  (SELECT * FROM  's3://{Config.CELLAR_METABASE_BUCKET_NAME}/data/{destination_table_name}.parquet');"
        context.log.info(f"Executing SQL: {COPY_QUERY}")
        destination_conn.execute(COPY_QUERY)




@multi_asset(
    specs=[
        AssetSpec(
            f"copy_through_s3_{table_name}",
            kinds={"duckdb"},
            deps=[AssetKey(["marts", table_name])],
            group_name="copy",
        )
        for table_name in RESULT_TABLES
    ],
    can_subset=True,
)
def copy_dagster_duckdb_to_metabase_duckdb_through_s3(
    context: AssetExecutionContext,
    duckdb: DuckDBResource,
    duckdb_local_metabase: DuckDBResource,
):

    for table_name in RESULT_TABLES:
        if (
            AssetKey(f"copy_through_s3_{table_name}")
            in context.op_execution_context.selected_asset_keys
        ):
            process_specific_table(
                context=context, 
                table_name=table_name,
                duckdb=duckdb,
                duckdb_metabase=duckdb_local_metabase
            )
            yield MaterializeResult(asset_key=f"copy_through_s3_{table_name}")
        else:
            pass
