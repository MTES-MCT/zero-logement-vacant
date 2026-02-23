"""
Configuration for external data sources to be ingested into DuckDB/MotherDuck.

This file centralizes all external data source definitions with their:
- URL or S3 path
- Table name (format: external.(provider)_(name)_raw)
- File type (csv, parquet, xlsx)
- Type hints for specific columns
- Description and metadata

Sources are organized by producer in separate modules in the config/ directory.
"""

from typing import TypedDict, Literal, Optional

from .config.anah import ANAH_CONFIG
from .config.anct import ANCT_CONFIG
from .config.private import PRIVATE_CONFIG
from .config.cerema import CEREMA_CONFIG
from .config.dgaln import DGALN_CONFIG
from .config.insee import INSEE_CONFIG
from .config.urssaf import URSSAF_CONFIG
from .config.dgfip import DGFIP_CONFIG


class SourceConfig(TypedDict):
    """Configuration for a single data source."""
    url: str  # Can be HTTP URL or s3:// path
    table_name: str  # Full table name in format: external.(provider)_(name)_raw
    file_type: Literal["csv", "parquet", "xlsx"]
    description: str
    producer: str  # Data producer (DGALN, CEREMA, INSEE, etc.)
    type_overrides: Optional[dict[str, str]]  # Column type overrides
    read_options: Optional[dict[str, any]]  # Additional read options (auto_detect, ignore_errors, sheet, etc.)


# =============================================================================
# MERGE ALL EXTERNAL SOURCES
# =============================================================================

EXTERNAL_SOURCES: dict[str, SourceConfig] = {
    **CEREMA_CONFIG,
    **DGALN_CONFIG,
    **INSEE_CONFIG,
    **URSSAF_CONFIG,
    **DGFIP_CONFIG,
    **PRIVATE_CONFIG,
    **ANAH_CONFIG,
    **ANCT_CONFIG
}


# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_sources_by_producer(producer: str) -> dict[str, SourceConfig]:
    """Get all sources for a specific producer."""
    return {
        name: config 
        for name, config in EXTERNAL_SOURCES.items() 
        if config["producer"] == producer
    }


def generate_create_table_sql(source_name: str, config: SourceConfig) -> str:
    """
    Generate DuckDB SQL to create a table from a source.
    
    This function generates the appropriate SQL based on file type (CSV, Parquet, or XLSX)
    and applies any type overrides or read options.
    
    Args:
        source_name: The key name from EXTERNAL_SOURCES dict (e.g., 'lovac_2024')
        config: The source configuration dictionary
    
    Returns:
        SQL string to create and populate the table
    """
    table_name = config["table_name"]  # Already includes schema: external.provider_name_raw
    url = config["url"]
    file_type = config["file_type"]
    type_overrides = config.get("type_overrides")
    read_options = config.get("read_options")
    
    # Build the read function based on file type
    if file_type == "parquet":
        read_func = "read_parquet"
        options = []
    elif file_type == "csv":
        read_func = "read_csv"
        options = []
        if read_options:
            for key, value in read_options.items():
                if isinstance(value, bool):
                    options.append(f"{key} = {str(value).upper()}")
                elif isinstance(value, str):
                    # Escape single quotes by doubling them for SQL
                    escaped_value = value.replace("'", "''")
                    options.append(f"{key} = '{escaped_value}'")
                else:
                    options.append(f"{key} = {value}")
    elif file_type == "xlsx":
        # XLSX uses read_xlsx function
        # Format: read_xlsx(filename, sheet='SheetName', named_options...)
        read_func = "read_xlsx"
        options = []
        if read_options:
            for key, value in read_options.items():
                if isinstance(value, bool):
                    options.append(f"{key} = {str(value).upper()}")
                elif isinstance(value, str):
                    # Escape single quotes by doubling them for SQL
                    escaped_value = value.replace("'", "''")
                    options.append(f"{key} = '{escaped_value}'")
                else:
                    options.append(f"{key} = {value}")
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
    
    # Add type overrides if specified (not supported for XLSX)
    if type_overrides and file_type != "xlsx":
        types_str = "{ " + ", ".join([f"'{k}': '{v}'" for k, v in type_overrides.items()]) + " }"
        options.append(f"types = {types_str}")
    
    # Build the full SQL
    options_str = ", ".join(options)
    if options_str:
        options_str = ", " + options_str
    
    sql = f"""
        CREATE OR REPLACE TABLE {table_name} AS (
            SELECT * FROM {read_func}('{url}'{options_str})
        );
    """
    
    return sql
