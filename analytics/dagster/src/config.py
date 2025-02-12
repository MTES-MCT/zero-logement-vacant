import os


class Config:
    CELLAR_METABASE_BUCKET_NAME = os.environ.get("CELLAR_METABASE_BUCKET_NAME")
    CELLAR_DATA_LAKE_BUCKET_NAME = os.environ.get("CELLAR_DATA_LAKE_BUCKET_NAME")
    CELLAR_METABASE_KEY_PATH = os.environ.get("CELLAR_METABASE_KEY_PATH")
    CELLAR_STATE_FF_LOVAC_KEY_PATH = os.environ.get("CELLAR_STATE_FF_LOVAC_KEY_PATH")

    CELLAR_ACCESS_KEY_ID = os.environ.get("CELLAR_ACCESS_KEY_ID")
    CELLAR_SECRET_ACCESS_KEY = os.environ.get("CELLAR_SECRET_ACCESS_KEY")
    CELLAR_HOST_URL = os.environ.get("CELLAR_HOST_URL")
    CELLAR_HTTP_HOST_URL = f"https://{CELLAR_HOST_URL}"
    CELLAR_REGION = os.environ.get("CELLAR_REGION")

    POSTGRES_PRODUCTION_DB = os.environ.get("POSTGRES_PRODUCTION_DB")
    POSTGRES_PRODUCTION_WRITE_ACCESS_PASSWORD = os.environ.get("POSTGRES_PRODUCTION_WRITE_ACCESS_PASSWORD")
    POSTGRES_PRODUCTION_WRITE_ACCESS_DB_NAME = os.environ.get("POSTGRES_PRODUCTION_WRITE_ACCESS_DB_NAME")
    POSTGRES_PRODUCTION_READONLY_PASSWORD = os.environ.get("POSTGRES_PRODUCTION_READONLY_PASSWORD")
    POSTGRES_PRODUCTION_READONLY_DB_NAME = os.environ.get("POSTGRES_PRODUCTION_READONLY_DB_NAME")

    CLEVER_TOKEN = os.environ.get("CLEVER_TOKEN")
    CLEVER_SECRET = os.environ.get("CLEVER_SECRET")

    DUCKDB_MEMORY_LIMIT = os.environ.get("DUCKDB_MEMORY_LIMIT")
    DUCKDB_THREAD_NUMBER = os.environ.get("DUCKDB_THREAD_NUMBER", 4)
    METABASE_APP_ID = os.environ.get("METABASE_APP_ID")

    MD_TOKEN = os.environ.get("MD_TOKEN")
    USE_MOTHER_DUCK = os.environ.get("USE_MOTHER_DUCK", "True") == "True"
    USE_MOTHER_DUCK_FOR_METABASE = os.environ.get("USE_MOTHER_DUCK_FOR_METABASE", "False") == "True"

    DAGSTER_RETRY_DELAY = 10 * 60 # 10 minutes
    DAGSTER_RETRY_MAX_ATTEMPS = 3

    BAN_API_URL = os.environ.get("BAN_API_URL")
    CSV_FILE_PATH = os.environ.get("CSV_FILE_PATH")
    try:
        CHUNK_SIZE = int(os.environ.get("CHUNK_SIZE", "10000"))
    except ValueError:
        raise ValueError("The environment variable CHUNK_SIZE must be an integer.")

    try:
        MAX_FILES = int(os.environ.get("MAX_FILES", "5"))
    except ValueError:
        raise ValueError("The environment variable MAX_FILES must be an integer.")

    DISABLE_MAX_FILES = os.environ.get("DISABLE_MAX_FILES", "True") == "True"

public_tables = [
    "marts_public_establishments_morphology",
    "marts_public_establishments_morphology_unpivoted",
]

analysis_tables = ["marts_analysis_exit_flow_ff23_lovac"]

common_tables = ["marts_common_cities", "marts_common_morphology"]

production_tables = [
    "marts_stats_monthly_global",
    "marts_production_housing",
    "marts_production_establishments",
    "marts_production_owners",
    "marts_production_groups",
    "marts_production_users",
    "marts_production_campaigns",
]

join_tables = [
    "marts_production_join_campaigns_housing",
    "marts_production_join_establishment_cities",
    "marts_production_join_housing_groups",
    "marts_production_join_owner_housing",
    "marts_production_join_establishment_housing",
]

translation_mapping = {
    "marts_production_join_campaigns_housing": "join_campaigns_housing",
    "marts_production_join_establishment_cities": "join_establishment_cities",
    "marts_production_join_housing_groups": "join_housing_groups",
    "marts_production_join_owner_housing": "join_owner_housing",
    "marts_production_join_establishment_housing": "join_establishment_housing",
    "marts_common_cities": "cities_zonage_2024",
    # "marts_common_morphology": "infra_municipalities_morphology",
    # "marts_production_campaigns": "prod_campaigns",
    # "marts_production_establishments": "prod_establishments",
    # "marts_production_groups": "prod_groups",
    # "marts_production_housing": "prod_housing",
    # "marts_production_owners": "prod_owners",
    # "marts_production_users": "prod_users",
    # "marts_public_establishments_morphology": "stats_establishments_morphology_annuals",
    # "marts_public_establishments_morphology_unpivoted": "stats_establishments_morphology_stocks",
    # "marts_stats_monthly_global": "stats_activity_monthly",
}

RESULT_TABLES = production_tables + join_tables + common_tables + public_tables


def translate_table_name(table_name):
    return translation_mapping.get(table_name, table_name)
