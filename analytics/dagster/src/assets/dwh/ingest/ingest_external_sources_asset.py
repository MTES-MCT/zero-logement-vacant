"""
Unified Dagster assets for ingesting all external data sources into DuckDB.

This module handles:
- S3-based sources (CEREMA: LOVAC, FF)
- HTTP-based sources (data.gouv.fr, INSEE, DGALN, URSSAF, DGFIP)

All sources are defined in external_sources_config.py and loaded into 
the 'external' schema with naming convention: external.(provider)_(name)_raw
"""

from dagster import AssetKey, asset, AssetExecutionContext, MaterializeResult, multi_asset, AssetSpec
from dagster_duckdb import DuckDBResource
from .queries.external_sources_config import EXTERNAL_SOURCES, generate_create_table_sql
from ....config import Config


@asset(
    name="setup_external_schema", 
    deps=["setup_duckdb"], 
    group_name="setup", 
    description="Setup external schema and S3 connection for external data sources"
)
def setup_external_schema(context: AssetExecutionContext, duckdb: DuckDBResource):
    """Create external schema and S3 secret if needed."""
    with duckdb.get_connection() as conn:
        # Create external schema
        schema_query = "CREATE SCHEMA IF NOT EXISTS external;"
        context.log.info(f"Executing SQL: {schema_query}")
        conn.execute(schema_query)
        
        # Setup S3 connection for CEREMA sources
        s3_secret_query = f"""
            CREATE OR REPLACE PERSISTENT SECRET SECRET (
                TYPE S3,
                KEY_ID '{Config.CELLAR_ACCESS_KEY_ID}',
                SECRET '{Config.CELLAR_SECRET_ACCESS_KEY}',
                ENDPOINT '{Config.CELLAR_HOST_URL}',
                REGION '{Config.CELLAR_REGION}'
            );
        """
        context.log.info(f"Setting up S3 secret for CEREMA sources")
        conn.execute(s3_secret_query)


@multi_asset(
    specs=[
        AssetSpec(
            source_name,
            deps=["setup_external_schema"],
            kinds={"duckdb", "s3" if config["url"].startswith("s3://") else "http"},
            group_name=config["producer"].lower(),
            description=config["description"],
            metadata={
                "producer": config["producer"],
                "source_url": config["url"],
                "file_type": config["file_type"],
                "table_name": config["table_name"],
            },
        )
        for source_name, config in EXTERNAL_SOURCES.items()
    ],
    can_subset=True,
)
def import_all_external_sources(
    context: AssetExecutionContext, 
    duckdb: DuckDBResource
):
    """
    Import all external data sources into DuckDB.
    
    This multi-asset dynamically creates one asset per source defined in 
    external_sources_config.py. Each asset can be materialized independently.
    
    Sources include:
    - CEREMA: LOVAC (2019-2025), Fichiers Fonciers (2019-2024)
    - DGALN: Carte des loyers, Zonage ABC
    - INSEE: Recensement, Population, Grille densité
    - URSSAF: Établissements et effectifs
    - DGFIP: Fiscalité locale
    """
    context.log.info(f"Importing external sources to DuckDB")
    
    for source_name, config in EXTERNAL_SOURCES.items():
        asset_key = AssetKey(source_name)
        
        if asset_key in context.op_execution_context.selected_asset_keys:
            context.log.info(f"Processing {source_name} from {config['producer']}")
            
            with duckdb.get_connection() as conn:
                # Generate and execute the CREATE TABLE SQL
                sql = generate_create_table_sql(source_name, config)
                context.log.info(f"Loading {source_name} from {config['url']}")
                context.log.debug(f"Executing SQL: {sql}")
                
                try:
                    conn.execute(sql)
                    row_count = conn.execute(f"SELECT COUNT(*) FROM {config['table_name']}").fetchone()[0]
                    context.log.info(f"✅ Successfully loaded {row_count:,} rows into {config['table_name']}")
                    
                    yield MaterializeResult(
                        asset_key=asset_key,
                        metadata={
                            "table": config['table_name'],
                            "row_count": row_count,
                            "producer": config['producer'],
                            "source_url": config['url'],
                        }
                    )
                except Exception as e:
                    context.log.error(f"❌ Failed to load {source_name}: {str(e)}")
                    raise
