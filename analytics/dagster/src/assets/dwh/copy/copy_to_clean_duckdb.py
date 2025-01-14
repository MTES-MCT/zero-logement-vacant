from dagster import AssetKey
from ....config import RESULT_TABLES, translate_table_name
from dagster_duckdb import DuckDBResource
from dagster import AssetExecutionContext, AssetSpec, MaterializeResult, multi_asset


source_schema = "main_marts"
destination_schema = "main"


def process_specific_table(context, table_name: str, duckdb: DuckDBResource, duckdb_metabase: DuckDBResource):
    source_db = duckdb.database
    chemin_destination_db = duckdb_metabase.database

    context.log.info(f"source_db: {source_db}")
    context.log.info(f"chemin_destination_db: {chemin_destination_db}")

    source_table_name = table_name
    destination_table_name = translate_table_name(table_name)
    with duckdb.get_connection() as source_conn:
        SOURCE_QUERY = f"SELECT * FROM {source_schema}.{source_table_name}"
        context.log.info(f"Executing SQL: {SOURCE_QUERY}")
        data = source_conn.execute(SOURCE_QUERY).fetchdf()
        print(data.head())
        with duckdb_metabase.get_connection() as conn:
            LOAD_QUERY = f"CREATE OR REPLACE TABLE {destination_table_name} AS SELECT * FROM data"
            context.log.info(f"Executing SQL: {LOAD_QUERY}")
            conn.execute(LOAD_QUERY)


@multi_asset(
    specs=[
        AssetSpec(
            f"copy_{table_name}",
            kinds={"duckdb"},
            deps=[AssetKey(["marts", table_name])],
            group_name="copy",
        )
        for table_name in RESULT_TABLES
    ],
    can_subset=True,
)
def copy_dagster_duckdb_to_metabase_duckdb(
    context: AssetExecutionContext,
    duckdb: DuckDBResource,
    duckdb_metabase: DuckDBResource,
):

    for table_name in RESULT_TABLES:
        if (
            AssetKey(f"copy_{table_name}")
            in context.op_execution_context.selected_asset_keys
        ):
            process_specific_table(
                context=context, 
                table_name=table_name,
                duckdb=duckdb,
                duckdb_metabase=duckdb_metabase
            )
            yield MaterializeResult(asset_key=f"copy_{table_name}")
        else:
            pass
