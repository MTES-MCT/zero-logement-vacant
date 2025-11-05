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
    table_name: str  # Full table name in format: external.(provider)_(name)_raw
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
    # CEREMA - Centre d'études et d'expertise sur les risques, l'environnement, la mobilité et l'aménagement
    # -------------------------------------------------------------------------
    
    # LOVAC Sources
    "lovac_2025": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2025/raw.csv",
        "table_name": "external.cerema_lovac_2025_raw",
        "file_type": "csv",
        "description": "Fichier LOVAC 2025 (Logements Vacants)",
        "producer": "CEREMA",
        "type_overrides": {
            'ff_jdatnss_6': 'VARCHAR', 'ff_jdatnss_5': 'VARCHAR', 'ff_jdatnss_4': 'VARCHAR',
            'ff_jdatnss_3': 'VARCHAR', 'ff_jdatnss_2': 'VARCHAR', 'ff_jdatnss_1': 'VARCHAR',
            'ff_ccogrm_1': 'VARCHAR', 'ff_ccogrm_2': 'VARCHAR', 'ff_ccogrm_3': 'VARCHAR',
            'ff_ccogrm_4': 'VARCHAR', 'ff_ccogrm_5': 'VARCHAR', 'ff_ccogrm_6': 'VARCHAR',
        },
        "read_options": {"auto_detect": True, "escape": '"', "quote": '"'},
    },
    
    "lovac_2024": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2024/raw.csv",
        "table_name": "external.cerema_lovac_2024_raw",
        "file_type": "csv",
        "description": "Fichier LOVAC 2024 (Logements Vacants)",
        "producer": "CEREMA",
        "type_overrides": {
            'ff_jdatnss_6': 'VARCHAR', 'ff_jdatnss_5': 'VARCHAR', 'ff_jdatnss_4': 'VARCHAR',
            'ff_jdatnss_3': 'VARCHAR', 'ff_jdatnss_2': 'VARCHAR', 'ff_jdatnss_1': 'VARCHAR',
            'ff_ccogrm_1': 'VARCHAR', 'ff_ccogrm_2': 'VARCHAR', 'ff_ccogrm_3': 'VARCHAR',
            'ff_ccogrm_4': 'VARCHAR', 'ff_ccogrm_5': 'VARCHAR', 'ff_ccogrm_6': 'VARCHAR',
        },
        "read_options": {"auto_detect": True},
    },
    
    "lovac_2023": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2023/raw.csv",
        "table_name": "external.cerema_lovac_2023_raw",
        "file_type": "csv",
        "description": "Fichier LOVAC 2023 (Logements Vacants)",
        "producer": "CEREMA",
        "type_overrides": {
            'ff_jdatnss_6': 'VARCHAR', 'ff_jdatnss_5': 'VARCHAR', 'ff_jdatnss_4': 'VARCHAR',
            'ff_jdatnss_3': 'VARCHAR', 'ff_jdatnss_2': 'VARCHAR', 'ff_jdatnss_1': 'VARCHAR',
            'ff_ccogrm_1': 'VARCHAR', 'ff_ccogrm_2': 'VARCHAR', 'ff_ccogrm_3': 'VARCHAR',
            'ff_ccogrm_4': 'VARCHAR', 'ff_ccogrm_5': 'VARCHAR', 'ff_ccogrm_6': 'VARCHAR',
        },
        "read_options": {"auto_detect": True},
    },
    
    "lovac_2022": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2022/raw.csv",
        "table_name": "external.cerema_lovac_2022_raw",
        "file_type": "csv",
        "description": "Fichier LOVAC 2022 (Logements Vacants)",
        "producer": "CEREMA",
        "type_overrides": None,
        "read_options": {"auto_detect": True, "ignore_errors": False},
    },
    
    "lovac_2021": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2021/raw.csv",
        "table_name": "external.cerema_lovac_2021_raw",
        "file_type": "csv",
        "description": "Fichier LOVAC 2021 (Logements Vacants)",
        "producer": "CEREMA",
        "type_overrides": None,
        "read_options": {"auto_detect": True, "ignore_errors": False, "quote": '"'},
    },
    
    "lovac_2020": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2020/raw.csv",
        "table_name": "external.cerema_lovac_2020_raw",
        "file_type": "csv",
        "description": "Fichier LOVAC 2020 (Logements Vacants)",
        "producer": "CEREMA",
        "type_overrides": None,
        "read_options": {"auto_detect": True, "ignore_errors": False},
    },
    
    "lovac_2019": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/lovac/2019/raw.csv",
        "table_name": "external.cerema_lovac_2019_raw",
        "file_type": "csv",
        "description": "Fichier LOVAC 2019 (Logements Vacants)",
        "producer": "CEREMA",
        "type_overrides": None,
        "read_options": {"auto_detect": True, "ignore_errors": False},
    },
    
    # Fichiers Fonciers Sources
    "ff_2024": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2024/raw.csv",
        "table_name": "external.cerema_ff_2024_raw",
        "file_type": "csv",
        "description": "Fichiers Fonciers 2024",
        "producer": "CEREMA",
        "type_overrides": {"ff_ccogrm": "VARCHAR"},
        "read_options": {"auto_detect": True, "ignore_errors": False},
    },
    
    "ff_2024_buildings": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2024/buildings.csv",
        "table_name": "external.cerema_ff_2024_buildings_raw",
        "file_type": "csv",
        "description": "Fichiers Fonciers 2024 - Buildings",
        "producer": "CEREMA",
        "type_overrides": None,
        "read_options": {"auto_detect": True, "ignore_errors": False},
    },
    
    "ff_2023": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2023/raw.csv",
        "table_name": "external.cerema_ff_2023_raw",
        "file_type": "csv",
        "description": "Fichiers Fonciers 2023",
        "producer": "CEREMA",
        "type_overrides": {"ff_ccogrm": "VARCHAR"},
        "read_options": {"auto_detect": True, "ignore_errors": False},
    },
    
    "ff_2022": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2022/raw.csv",
        "table_name": "external.cerema_ff_2022_raw",
        "file_type": "csv",
        "description": "Fichiers Fonciers 2022",
        "producer": "CEREMA",
        "type_overrides": {"ff_ccogrm": "VARCHAR"},
        "read_options": {"auto_detect": True, "ignore_errors": False},
    },
    
    "ff_2021": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2021/raw.csv",
        "table_name": "external.cerema_ff_2021_raw",
        "file_type": "csv",
        "description": "Fichiers Fonciers 2021",
        "producer": "CEREMA",
        "type_overrides": {"ff_ccogrm": "VARCHAR"},
        "read_options": {"auto_detect": True, "ignore_errors": False},
    },
    
    "ff_2020": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2020/raw.csv",
        "table_name": "external.cerema_ff_2020_raw",
        "file_type": "csv",
        "description": "Fichiers Fonciers 2020",
        "producer": "CEREMA",
        "type_overrides": {"ff_ccogrm": "VARCHAR"},
        "read_options": {"auto_detect": True, "ignore_errors": False},
    },
    
    "ff_2019": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2019/raw.csv",
        "table_name": "external.cerema_ff_2019_raw",
        "file_type": "csv",
        "description": "Fichiers Fonciers 2019",
        "producer": "CEREMA",
        "type_overrides": {"ff_ccogrm": "VARCHAR"},
        "read_options": {"auto_detect": True, "ignore_errors": False},
    },
    
    "ff_owners": {
        "url": f"s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/cerema/ff/2023/owners.csv",
        "table_name": "external.cerema_ff_owners_raw",
        "file_type": "csv",
        "description": "Fichiers Fonciers - Owners",
        "producer": "CEREMA",
        "type_overrides": {"ccogrm": "VARCHAR"},
        "read_options": {"auto_detect": True, "ignore_errors": False},
    },
    
    # -------------------------------------------------------------------------
    # DGALN - Direction Générale de l'Aménagement, du Logement et de la Nature
    # -------------------------------------------------------------------------
    
    "carte_des_loyers_2023": {
        "url": "https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/0de53e33c5b555111ffaf7a9849540c7.parquet",
        "table_name": "external.dgaln_carte_loyers_2023_raw",
        "file_type": "parquet",
        "description": "Indicateurs de loyers d'annonce par commune en 2023 (MTE)",
        "producer": "DGALN",
        "type_overrides": None,
        "read_options": None,
    },
    
    "zonage_abc": {
        "url": "https://object.files.data.gouv.fr/hydra-parquet/hydra-parquet/5a9989ac0f32cd6aa41d5d60638390c0.parquet",
        "table_name": "external.dgaln_zonage_abc_raw",
        "file_type": "parquet",
        "description": "Zonage ABC pour les aides au logement",
        "producer": "DGALN",
        "type_overrides": None,
        "read_options": None,
    },
    
    # -------------------------------------------------------------------------
    # INSEE
    # -------------------------------------------------------------------------
    
    "recensement_historique": {
        "url": "https://www.insee.fr/fr/statistiques/fichier/TODO.csv",  # TODO: Add real URL
        "table_name": "external.insee_recensement_historique_raw",
        "file_type": "csv",
        "description": "Série historique du recensement de la population (1968-2022)",
        "producer": "INSEE",
        "type_overrides": None,
        "read_options": {"auto_detect": True, "delimiter": ";", "header": True},
    },
    
    "population_structures_ages": {
        "url": "https://www.insee.fr/fr/statistiques/fichier/TODO.csv",  # TODO: Add real URL
        "table_name": "external.insee_population_structures_ages_raw",
        "file_type": "csv",
        "description": "Population - structures d'âges (2011-2022)",
        "producer": "INSEE",
        "type_overrides": None,
        "read_options": {"auto_detect": True},
    },
    
    "grille_densite": {
        "url": "https://www.insee.fr/fr/statistiques/fichier/TODO.csv",  # TODO: Add real URL
        "table_name": "external.insee_grille_densite_raw",
        "file_type": "csv",
        "description": "Grille densité INSEE",
        "producer": "INSEE",
        "type_overrides": None,
        "read_options": {"auto_detect": True},
    },
    
    "table_appartenance_geo": {
        "url": "https://www.insee.fr/fr/statistiques/fichier/TODO.csv",  # TODO: Add real URL
        "table_name": "external.insee_table_appartenance_geo_raw",
        "file_type": "csv",
        "description": "Table d'appartenance géographique",
        "producer": "INSEE",
        "type_overrides": None,
        "read_options": {"auto_detect": True},
    },
    
    # -------------------------------------------------------------------------
    # URSSAF
    # -------------------------------------------------------------------------
    
    "etablissements_effectifs": {
        "url": "https://open.urssaf.fr/explore/dataset/TODO/download/",  # TODO: Add real URL
        "table_name": "external.urssaf_etablissements_effectifs_raw",
        "file_type": "csv",
        "description": "Nombre d'établissements employeurs et effectifs salariés du secteur privé, par commune x APE (2006-2022)",
        "producer": "URSSAF",
        "type_overrides": None,
        "read_options": {"auto_detect": True, "delimiter": ";"},
    },
    
    # -------------------------------------------------------------------------
    # DGFIP
    # -------------------------------------------------------------------------
    
    "fiscalite_locale": {
        "url": "https://data.economie.gouv.fr/explore/dataset/TODO/download/",  # TODO: Add real URL
        "table_name": "external.dgfip_fiscalite_locale_particuliers_raw",
        "file_type": "csv",
        "description": "Fiscalité locale des particuliers",
        "producer": "DGFIP",
        "type_overrides": None,
        "read_options": {"auto_detect": True},
    },
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
    
    This function generates the appropriate SQL based on file type (CSV or Parquet)
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
        CREATE OR REPLACE TABLE {table_name} AS (
            SELECT * FROM {read_func}('{url}'{options_str})
        );
    """
    
    return sql


