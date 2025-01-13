from dagster import AssetKey
from ....config import RESULT_TABLES, translate_table_name
from dagster_duckdb import DuckDBResource
from dagster import AssetExecutionContext, AssetSpec, MaterializeResult, multi_asset
import tempfile
import os

source_schema = "main_marts"
destination_schema = "main"


def process_specific_table(context, table_name: str, duckdb: DuckDBResource, duckdb_metabase: DuckDBResource):
    source_db = duckdb.database
    chemin_destination_db = duckdb_metabase.database

    context.log.info(f"source_db: {source_db}")
    context.log.info(f"chemin_destination_db: {chemin_destination_db}")

    source_table_name = table_name
    destination_table_name = translate_table_name(table_name)

    # Create a temporary file for the Parquet file
    with tempfile.NamedTemporaryFile(suffix=".parquet", delete=False) as temp_parquet_file:
        temp_file_path = temp_parquet_file.name

    try:
        # Export data from the source DuckDB database to a Parquet file
        with duckdb.get_connection() as source_conn:
            SOURCE_QUERY = f"COPY (SELECT * FROM {source_schema}.{source_table_name}) TO '{temp_file_path}' (FORMAT PARQUET);"
            context.log.info(f"Executing SQL on source: {SOURCE_QUERY}")
            source_conn.execute(SOURCE_QUERY)

        # Import data from the Parquet file into the destination DuckDB database
        with duckdb_metabase.get_connection() as destination_conn:
            LOAD_QUERY = f"CREATE OR REPLACE TABLE {destination_schema}.{destination_table_name} AS SELECT * FROM parquet_scan('{temp_file_path}');"
            context.log.info(f"Executing SQL on destination: {LOAD_QUERY}")
            destination_conn.execute(LOAD_QUERY)

        context.log.info(f"Data successfully transferred to table: {destination_table_name}")

    finally:
        # Ensure the temporary file is deleted
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
            context.log.info(f"Temporary file deleted: {temp_file_path}")


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
