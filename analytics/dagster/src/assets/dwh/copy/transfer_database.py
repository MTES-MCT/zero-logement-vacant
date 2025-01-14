from dagster import AssetExecutionContext, AssetKey, AssetSpec, MaterializeResult, asset, multi_asset
from ....config import RESULT_TABLES, Config
from dagster_duckdb import DuckDBResource
import tempfile
from ..ingest.queries.lovac import lovac_tables_sql
from ..ingest.queries.ff import ff_tables_sql
import os 
#import psutil
import shutil


all_tables_sql = {**lovac_tables_sql, **ff_tables_sql}


def log_system_resources(context):
    """
    Logs the available disk space and memory on the system.
    """
    # Get disk usage statistics
    total, used, free = shutil.disk_usage("/")
    context.log.info(f"Disk Space - Total: {total / (1024**3):.2f} GB, Used: {used / (1024**3):.2f} GB, Free: {free / (1024**3):.2f} GB")

    # Get memory statistics
    memory_info = "" #psutil.virtual_memory()
    context.log.info(f"Memory - Total: {memory_info.total / (1024**3):.2f} GB, "
                     f"Used: {memory_info.used / (1024**3):.2f} GB, "
                     f"Available: {memory_info.available / (1024**3):.2f} GB")
    

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
    log_system_resources(context)

    with tempfile.TemporaryDirectory() as temp_dir:
        try:
            with duckdb_metabase.get_connection() as source_conn:
                EXPORT_QUERY = f"EXPORT DATABASE '{temp_dir}';"
                context.log.info(f"Executing SQL on source: {EXPORT_QUERY}")
                source_conn.execute(EXPORT_QUERY)
            
            context.log.info(f"Database exported successfully to: {temp_dir}")
            log_system_resources(context)
            clear_database_file(context, db_path=dest_db)
            log_system_resources(context)

            with duckdb_local_metabase.get_connection() as dest_conn:

                SETUP_QUERY = f"""
                    SET memory_limit = '{Config.DUCKDB_MEMORY_LIMIT}GB';
                    SET threads TO {Config.DUCKDB_THREAD_NUMBER};
                """
                context.log.info(f"Executing SQL on destination: {SETUP_QUERY}")
                dest_conn.execute(SETUP_QUERY)

                IMPORT_QUERY = f"IMPORT DATABASE '{temp_dir}';"
                context.log.info(f"Executing SQL on destination: {IMPORT_QUERY}")
                dest_conn.execute(IMPORT_QUERY)
            context.log.info(f"Database imported successfully into: {dest_db}")

        except Exception as e:
            context.log.error(f"Error during database transfer: {e}")
            raise