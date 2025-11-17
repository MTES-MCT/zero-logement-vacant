"""
Unified Dagster assets for ingesting all external data sources into DuckDB.

This module handles:
- S3-based sources (CEREMA: LOVAC, FF)
- HTTP-based sources (data.gouv.fr, INSEE, DGALN, URSSAF, DGFIP)

All sources are defined in external_sources_config.py and loaded into 
the 'external' schema with naming convention: external.(provider)_(name)_raw
"""

import os
import tempfile
import requests
from pathlib import Path
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


def _download_file(url: str, context: AssetExecutionContext) -> str:
    """
    Download a file from HTTP URL to a temporary location.
    
    Args:
        url: The HTTP URL to download from
        context: Dagster execution context for logging
    
    Returns:
        Path to the downloaded temporary file
    """
    context.log.info(f"Downloading {url}...")
    response = requests.get(url, stream=True)
    response.raise_for_status()
    
    # Create temp file with appropriate extension
    suffix = Path(url).suffix
    fd, temp_path = tempfile.mkstemp(suffix=suffix)
    
    with os.fdopen(fd, 'wb') as f:
        for chunk in response.iter_content(chunk_size=8192):
            f.write(chunk)
    
    context.log.info(f"Downloaded to {temp_path}")
    return temp_path


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
    
    Note: XLSX files from HTTP URLs are downloaded first since DuckDB's read_xlsx
    doesn't support HTTP directly.
    """
    context.log.info(f"Importing external sources to DuckDB")
    
    for source_name, config in EXTERNAL_SOURCES.items():
        asset_key = AssetKey(source_name)
        
        if asset_key in context.op_execution_context.selected_asset_keys:
            context.log.info(f"Processing {source_name} from {config['producer']}")
            
            # Handle XLSX files from HTTP - need to download first
            temp_file = None
            url = config['url']
            file_type = config['file_type']
            
            try:
                if file_type == 'xlsx' and url.startswith(('http://', 'https://')):
                    # Download XLSX file to temp location
                    temp_file = _download_file(url, context)
                    # Update config to use local file
                    config_copy = config.copy()
                    config_copy['url'] = temp_file
                    sql = generate_create_table_sql(source_name, config_copy)
                else:
                    # Use original URL for CSV, Parquet, or S3 sources
                    sql = generate_create_table_sql(source_name, config)
                
                with duckdb.get_connection() as conn:
                    context.log.info(f"Loading {source_name} from {url}")
                    context.log.debug(f"Executing SQL: {sql}")
                    
                    conn.execute(sql)
                    row_count = conn.execute(f"SELECT COUNT(*) FROM {config['table_name']}").fetchone()[0]
                    context.log.info(f"✅ Successfully loaded {row_count:,} rows into {config['table_name']}")
                    
                    yield MaterializeResult(
                        asset_key=asset_key,
                        metadata={
                            "table": config['table_name'],
                            "row_count": row_count,
                            "producer": config['producer'],
                            "source_url": url,
                        }
                    )
            except Exception as e:
                context.log.error(f"❌ Failed to load {source_name}: {str(e)}")
                raise
            finally:
                # Clean up temp file if it was created
                if temp_file and os.path.exists(temp_file):
                    os.unlink(temp_file)
                    context.log.debug(f"Cleaned up temp file: {temp_file}")
