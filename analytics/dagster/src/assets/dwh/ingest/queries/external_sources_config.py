"""
Configuration for external data sources to be ingested into DuckDB/MotherDuck.

This file centralizes all external data source definitions with their:
- URL or S3 path
- Schema (target DuckDB schema)
- Table name
- Type hints for specific columns
- Description and metadata
"""

from typing import TypedDict, Literal, Optional
from .....config import Config


class SourceConfig(TypedDict):
    """Configuration for a single data source."""
    url: str  # Can be HTTP URL or s3:// path
    schema: str  # Target schema in DuckDB
    table_name: str
    file_type: Literal["csv", "parquet"]
    description: str
    producer: str  # Data producer (DGALN, CEREMA, INSEE, etc.)
    type_overrides: Optional[dict[str, str]]  # Column type overrides
    read_options: Optional[dict[str, any]]  # Additional read options (auto_detect, ignore_errors, etc.)


# =============================================================================
# EXTERNAL DATA SOURCES FROM DATA.GOUV.FR
# =============================================================================

EXTERNAL_SOURCES: dict[str, SourceConfig] = {
    
    # -------------------------------------------------------------------------
    # DGALN - Direction Générale de l'Aménagement, du Logement et de la Nature
    # -------------------------------------------------------------------------
    
    "carte_des_loyers_2023": {
        "url": "https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/0de53e33c5b555111ffaf7a9849540c7.parquet",
        "schema": "dgaln",
        "table_name": "carte_loyers_2023",
        "file_type": "parquet",
        "description": "Indicateurs de loyers d'annonce par commune en 2023 (MTE)",
        "producer": "DGALN",
        "type_overrides": None,
        "read_options": None,
    },
    
    "zonage_abc": {
        "url": "https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/5a9989ac0f32cd6aa41d5d60638390c0.parquet",
        "schema": "dgaln",
        "table_name": "zonage_abc",
        "file_type": "parquet",
        "description": "Zonage ABC pour les aides au logement",
        "producer": "DGALN",
        "type_overrides": None,
        "read_options": None,
    },
    
    # -------------------------------------------------------------------------
    # CEREMA
    # -------------------------------------------------------------------------
    
    # Note: Your existing LOVAC/FF sources are already managed separately
    # Add new CEREMA sources here if needed
    
    "cerema_consommation_espace": {
        "url": "https://datafoncier.cerema.fr/data/consommation_espace/TODO.csv",  # TODO: Add real URL
        "schema": "cerema",
        "table_name": "consommation_espace",
        "file_type": "csv",
        "description": "Consommation d'espace (2009-2022)",
        "producer": "CEREMA",
        "type_overrides": None,
        "read_options": {
            "auto_detect": True,
            "ignore_errors": False,
        },
    },
    
    # -------------------------------------------------------------------------
    # INSEE
    # -------------------------------------------------------------------------
    
    "insee_recensement_historique": {
        "url": "https://www.insee.fr/fr/statistiques/fichier/TODO.csv",  # TODO: Add real URL
        "schema": "insee",
        "table_name": "recensement_historique",
        "file_type": "csv",
        "description": "Série historique du recensement de la population (1968-2022)",
        "producer": "INSEE",
        "type_overrides": None,
        "read_options": {
            "auto_detect": True,
            "delimiter": ";",
            "header": True,
        },
    },
    
    "insee_population_structures_ages": {
        "url": "https://www.insee.fr/fr/statistiques/fichier/TODO.csv",  # TODO: Add real URL
        "schema": "insee",
        "table_name": "population_structures_ages",
        "file_type": "csv",
        "description": "Population - structures d'âges (2011-2022)",
        "producer": "INSEE",
        "type_overrides": None,
        "read_options": {
            "auto_detect": True,
        },
    },
    
    "insee_grille_densite": {
        "url": "https://www.insee.fr/fr/statistiques/fichier/TODO.csv",  # TODO: Add real URL
        "schema": "insee",
        "table_name": "grille_densite",
        "file_type": "csv",
        "description": "Grille densité INSEE",
        "producer": "INSEE",
        "type_overrides": None,
        "read_options": {
            "auto_detect": True,
        },
    },
    
    "insee_table_appartenance_geo": {
        "url": "https://www.insee.fr/fr/statistiques/fichier/TODO.csv",  # TODO: Add real URL
        "schema": "insee",
        "table_name": "table_appartenance_geo",
        "file_type": "csv",
        "description": "Table d'appartenance géographique",
        "producer": "INSEE",
        "type_overrides": None,
        "read_options": {
            "auto_detect": True,
        },
    },
    
    # -------------------------------------------------------------------------
    # URSSAF
    # -------------------------------------------------------------------------
    
    "urssaf_etablissements_effectifs": {
        "url": "https://open.urssaf.fr/explore/dataset/TODO/download/",  # TODO: Add real URL
        "schema": "urssaf",
        "table_name": "etablissements_effectifs",
        "file_type": "csv",
        "description": "Nombre d'établissements employeurs et effectifs salariés du secteur privé, par commune x APE (2006-2022)",
        "producer": "URSSAF",
        "type_overrides": None,
        "read_options": {
            "auto_detect": True,
            "delimiter": ";",
        },
    },
    
    # -------------------------------------------------------------------------
    # DGFIP
    # -------------------------------------------------------------------------
    
    "dgfip_fiscalite_locale": {
        "url": "https://data.economie.gouv.fr/explore/dataset/TODO/download/",  # TODO: Add real URL
        "schema": "dgfip",
        "table_name": "fiscalite_locale_particuliers",
        "file_type": "csv",
        "description": "Fiscalité locale des particuliers",
        "producer": "DGFIP",
        "type_overrides": None,
        "read_options": {
            "auto_detect": True,
        },
    },
}


# =============================================================================
# S3-BASED SOURCES (your existing pattern)
# =============================================================================

# Keep your existing LOVAC/FF sources in lovac.py and ff.py
# This is good for data you control and want versioned

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


def get_sources_by_schema(schema: str) -> dict[str, SourceConfig]:
    """Get all sources for a specific schema."""
    return {
        name: config 
        for name, config in EXTERNAL_SOURCES.items() 
        if config["schema"] == schema
    }


def generate_create_table_sql(source_name: str, config: SourceConfig) -> str:
    """
    Generate DuckDB SQL to create a table from a source.
    
    This function generates the appropriate SQL based on file type (CSV or Parquet)
    and applies any type overrides or read options.
    """
    schema = config["schema"]
    table_name = config["table_name"]
    url = config["url"]
    file_type = config["file_type"]
    type_overrides = config.get("type_overrides")
    read_options = config.get("read_options", {})
    
    # Build the read function based on file type
    if file_type == "parquet":
        read_func = "read_parquet"
        # Parquet has fewer options typically
        options = []
    elif file_type == "csv":
        read_func = "read_csv"
        # Build CSV options
        options = []
        if read_options:
            for key, value in read_options.items():
                if isinstance(value, bool):
                    options.append(f"{key} = {str(value).upper()}")
                elif isinstance(value, str):
                    options.append(f"{key} = '{value}'")
                else:
                    options.append(f"{key} = {value}")
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
    
    # Add type overrides if specified
    if type_overrides:
        types_str = "{ " + ", ".join([f"'{k}': '{v}'" for k, v in type_overrides.items()]) + " }"
        options.append(f"types = {types_str}")
    
    # Build the full SQL
    options_str = ", ".join(options)
    if options_str:
        options_str = ", " + options_str
    
    sql = f"""
        CREATE OR REPLACE TABLE {schema}.{table_name} AS (
            SELECT * FROM {read_func}('{url}'{options_str})
        );
    """
    
    return sql


