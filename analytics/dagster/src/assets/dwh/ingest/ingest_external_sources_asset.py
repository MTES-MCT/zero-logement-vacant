"""
Dagster assets for ingesting external data sources (data.gouv.fr, INSEE, etc.) into DuckDB.

This module uses the centralized source configuration from external_sources_config.py
to dynamically create Dagster assets for each external source.
"""

from dagster import AssetKey, asset, AssetExecutionContext, MaterializeResult, multi_asset, AssetSpec
from dagster_duckdb import DuckDBResource
from .queries.external_sources_config import EXTERNAL_SOURCES, generate_create_table_sql, get_sources_by_producer


def process_external_source(
    source_name: str, 
    context: AssetExecutionContext, 
    duckdb: DuckDBResource
):
    """Process a single external source by executing its SQL."""
    config = EXTERNAL_SOURCES[source_name]
    
    with duckdb.get_connection() as conn:
        # Create schema if it doesn't exist
        schema_query = f"CREATE SCHEMA IF NOT EXISTS {config['schema']};"
        context.log.info(f"Creating schema: {schema_query}")
        conn.execute(schema_query)
        
        # Generate and execute the CREATE TABLE SQL
        sql = generate_create_table_sql(source_name, config)
        context.log.info(f"Loading {source_name} from {config['url']}")
        context.log.debug(f"Executing SQL: {sql}")
        
        try:
            result = conn.execute(sql)
            row_count = conn.execute(f"SELECT COUNT(*) FROM {config['schema']}.{config['table_name']}").fetchone()[0]
            context.log.info(f"Successfully loaded {row_count} rows into {config['schema']}.{config['table_name']}")
        except Exception as e:
            context.log.error(f"Failed to load {source_name}: {str(e)}")
            raise


@multi_asset(
    specs=[
        AssetSpec(
            f"raw_{source_name}",
            deps=["setup_duckdb"],
            kinds={"duckdb", "http"},
            group_name=config["producer"].lower(),
            description=config["description"],
            metadata={
                "producer": config["producer"],
                "source_url": config["url"],
                "file_type": config["file_type"],
            },
        )
        for source_name, config in EXTERNAL_SOURCES.items()
    ],
    can_subset=True,
)
def import_external_sources_to_duckdb(
    context: AssetExecutionContext, 
    duckdb: DuckDBResource
):
    """
    Import external data sources (data.gouv.fr, INSEE, etc.) into DuckDB.
    
    This multi-asset dynamically creates one asset per source defined in 
    external_sources_config.py. Each asset can be materialized independently.
    """
    context.log.info(f"Importing external sources to DuckDB")
    
    for source_name in EXTERNAL_SOURCES:
        asset_key = AssetKey(f"raw_{source_name}")
        
        if asset_key in context.op_execution_context.selected_asset_keys:
            context.log.info(f"Processing {source_name}")
            process_external_source(source_name, context, duckdb)
            yield MaterializeResult(
                asset_key=asset_key,
                metadata={
                    "table": f"{EXTERNAL_SOURCES[source_name]['schema']}.{EXTERNAL_SOURCES[source_name]['table_name']}",
                }
            )


# =============================================================================
# PRODUCER-SPECIFIC ASSETS (optional, for better organization)
# =============================================================================

def create_producer_asset(producer: str):
    """
    Factory function to create a multi-asset for a specific producer.
    This allows you to materialize all sources from one producer at once.
    """
    sources = get_sources_by_producer(producer)
    
    @multi_asset(
        name=f"import_{producer.lower()}_sources",
        specs=[
            AssetSpec(
                f"raw_{source_name}",
                deps=["setup_duckdb"],
                kinds={"duckdb", "http"},
                group_name=producer.lower(),
                description=config["description"],
            )
            for source_name, config in sources.items()
        ],
        can_subset=True,
    )
    def import_producer_sources(
        context: AssetExecutionContext, 
        duckdb: DuckDBResource
    ):
        for source_name in sources:
            asset_key = AssetKey(f"raw_{source_name}")
            if asset_key in context.op_execution_context.selected_asset_keys:
                process_external_source(source_name, context, duckdb)
                yield MaterializeResult(asset_key=asset_key)
    
    return import_producer_sources


# You can create specific assets per producer if desired
# import_dgaln_sources = create_producer_asset("DGALN")
# import_insee_sources = create_producer_asset("INSEE")
# import_urssaf_sources = create_producer_asset("URSSAF")


