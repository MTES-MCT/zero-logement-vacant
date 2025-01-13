from dagster import AssetExecutionContext, AssetKey, AssetSpec, MaterializeResult, asset, multi_asset
from ....config import RESULT_TABLES
from dagster_duckdb import DuckDBResource
import tempfile
from ..ingest.queries.lovac import lovac_tables_sql
from ..ingest.queries.ff import ff_tables_sql
import os 


all_tables_sql = {**lovac_tables_sql, **ff_tables_sql}

def clear_database_file(context, db_path: str):
    if os.path.exists(db_path):
        context.log.info(f"Deleting existing database file: {db_path}")
        os.remove(db_path)
    else:
        context.log.info(f"No existing database file found at: {db_path}")

@asset(
    name="export_mother_duck_local_duckdb",
    deps={AssetKey(f"copy_{table_name}") for table_name in RESULT_TABLES},
    group_name="upload",
)
def export_mother_duck_local_duckdb(context, duckdb_metabase: DuckDBResource, duckdb_local_metabase: DuckDBResource):
    source_db = duckdb_metabase.database
    dest_db = duckdb_local_metabase.database

    context.log.info(f"Source database path: {source_db}")
    context.log.info(f"Destination database path: {dest_db}")

    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            with duckdb_metabase.get_connection() as source_conn:
                EXPORT_QUERY = f"EXPORT DATABASE '{temp_dir}' (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 100000);"
                context.log.info(f"Executing SQL on source: {EXPORT_QUERY}")
                source_conn.execute(EXPORT_QUERY)
            
            context.log.info(f"Database exported successfully to: {temp_dir}")

            clear_database_file(context, db_path=dest_db)

            with duckdb_local_metabase.get_connection() as dest_conn:
                IMPORT_QUERY = f"IMPORT DATABASE '{temp_dir}';"
                context.log.info(f"Executing SQL on destination: {IMPORT_QUERY}")
                dest_conn.execute(IMPORT_QUERY)
            context.log.info(f"Database imported successfully into: {dest_db}")

        except Exception as e:
            context.log.error(f"Error during database transfer: {e}")
            raise