from typing import List
from dagster import AssetKey, asset
from ..config import RESULT_TABLES, translate_table_name
from dagster_duckdb import DuckDBResource
from dagster import AssetExecutionContext, AssetSpec, MaterializeResult, multi_asset
import numpy as np

from tqdm.auto import tqdm 

source_schema = "main_marts"
destination_schema = "main"


def process_specific_table(table_name: str, duckdb: DuckDBResource, duckdb_metabase: DuckDBResource):
    chemin_destination_db = duckdb_metabase.database  # Assurez-vous que ce chemin est correct

    source_table_name = table_name
    destination_table_name = translate_table_name(table_name)
    with duckdb.get_connection() as conn:
        # Attacher les bases de données source et destination
        conn.execute(f"ATTACH '{chemin_destination_db}' AS destination_db;")
            # Copier la table du schéma source vers le schéma destination
        conn.execute(f"""
            CREATE TABLE destination_db.{destination_schema}.{source_table_name} AS
            SELECT * FROM {source_schema}.{destination_table_name};
        """)

        # Détacher les bases de données
        conn.execute("DETACH DATABASE source_db;")
        conn.execute("DETACH DATABASE destination_db;")


@multi_asset(
    specs=[
        AssetSpec(f"copy_{table_name}",
                   kinds={"duckdb"},
                    deps=[AssetKey(["marts", table_name])], 
                    group_name="copy"
                    ) for table_name in RESULT_TABLES],
    can_subset=True,
)
def copy_dagster_duckdb_to_metabase_duckdb(context: AssetExecutionContext,
                                            duckdb: DuckDBResource,
                                            duckdb_metabase: DuckDBResource):
    
    for table_name in RESULT_TABLES:
        if AssetKey(f"copy_{table_name}") in context.op_execution_context.selected_asset_keys:
            process_specific_table(table_name=table_name,
                                duckdb=duckdb, 
                                duckdb_metabase=duckdb_metabase)
            yield MaterializeResult(
                asset_key=f"copy_{table_name}"
            )
        else:
            pass