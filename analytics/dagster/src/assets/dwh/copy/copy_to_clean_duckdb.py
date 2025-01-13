from dagster import AssetKey
from ....config import RESULT_TABLES, translate_table_name
from dagster_duckdb import DuckDBResource
from dagster import AssetExecutionContext, AssetSpec, MaterializeResult, multi_asset


source_schema = "main_marts"
destination_schema = "main"


def process_specific_table(
    table_name: str, duckdb: DuckDBResource, duckdb_metabase: DuckDBResource
):
    source_db = duckdb.database
    chemin_destination_db = duckdb_metabase.database

    source_table_name = table_name
    destination_table_name = translate_table_name(table_name)
    with duckdb_metabase.get_connection() as conn:
        conn.execute(f"ATTACH '{source_db}' AS source_db;")
        conn.execute(
            f"""
            CREATE OR REPLACE TABLE {chemin_destination_db}.{destination_schema}.{destination_table_name} AS
            SELECT * FROM {source_schema}.{source_table_name};
        """
        )
        conn.execute("DETACH DATABASE source_db;")


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
                table_name=table_name, duckdb=duckdb, duckdb_metabase=duckdb_metabase
            )
            yield MaterializeResult(asset_key=f"copy_{table_name}")
        else:
            pass
