import os


class Config:
    CELLAR_METABASE_BUCKET_NAME = os.environ.get("CELLAR_METABASE_BUCKET_NAME")
    CELLAR_DATA_LAKE_BUCKET_NAME = os.environ.get("CELLAR_DATA_LAKE_BUCKET_NAME")
    CELLAR_METABASE_KEY_PATH = os.environ.get("CELLAR_METABASE_KEY_PATH")
    CELLAR_ACCESS_KEY_ID = os.environ.get("CELLAR_ACCESS_KEY_ID")
    CELLAR_SECRET_ACCESS_KEY = os.environ.get("CELLAR_SECRET_ACCESS_KEY")
    CELLAR_HOST_URL = os.environ.get("CELLAR_HOST_URL")
    CELLAR_HTTP_HOST_URL = os.environ.get("CELLAR_HTTP_HOST_URL")
    CELLAR_REGION = os.environ.get("CELLAR_REGION")

    POSTGRES_PRODUCTION_DB = os.environ.get("POSTGRES_PRODUCTION_DB")
    POSTGRES_PRODUCTION_PORT = os.environ.get("POSTGRES_PRODUCTION_PORT")
    POSTGRES_PRODUCTION_USER = os.environ.get("POSTGRES_PRODUCTION_USER")
    POSTGRES_PRODUCTION_PASSWORD = os.environ.get("POSTGRES_PRODUCTION_PASSWORD")
    POSTGRES_PRODUCTION_DB_NAME = os.environ.get("POSTGRES_PRODUCTION_DB_NAME")

    CELLAR_OAUTH_KEY =  os.environ.get("CELLAR_OAUTH_KEY")
    CELLAR_OAUTH_SECRET =  os.environ.get("CELLAR_OAUTH_SECRET")

    DUCKDB_MEMORY_LIMIT= os.environ.get("DUCKDB_MEMORY_LIMIT")


public_tables = ["marts_public_establishments_morphology", "marts_public_establishments_morphology_unpivoted"] 

analysis_tables = ["marts_analysis_exit_flow_ff23_lovac"]

common_tables = ["marts_common_cities", "marts_common_morphology"]

production_tables = ["marts_stats_monthly_global",
          "marts_production_housing",
          "marts_production_establishments",
          "marts_production_owners",
          "marts_production_groups",
          "marts_production_users",
          "marts_production_campaigns"    
]

join_tables = [
    "marts_production_join_campaigns_housing",
    "marts_production_join_establishment_cities",
    "marts_production_join_housing_groups",
    "marts_production_join_owner_housing",
    "marts_production_join_establishment_housing"
]

translation_mapping ={
    "marts_production_join_campaigns_housing" : "join_campaigns_housing",
    "marts_production_join_establishment_cities": "join_establishment_cities",
    "marts_production_join_housing_groups": "join_housing_groups",
    "marts_production_join_owner_housing": "join_owner_housing",
    "marts_production_join_establishment_housing": "join_establishment_housing",
    "marts_common_cities": "cities_zonage_2024",
    #"marts_common_morphology": "infra_municipalities_morphology",
    #"marts_production_campaigns": "prod_campaigns",
    #"marts_production_establishments": "prod_establishments",
    #"marts_production_groups": "prod_groups",
    #"marts_production_housing": "prod_housing",
    #"marts_production_owners": "prod_owners",
    #"marts_production_users": "prod_users",
    #"marts_public_establishments_morphology": "stats_establishments_morphology_annuals",
    #"marts_public_establishments_morphology_unpivoted": "stats_establishments_morphology_stocks",
    #"marts_stats_monthly_global": "stats_activity_monthly",
}

RESULT_TABLES = production_tables + join_tables + common_tables + public_tables

def translate_table_name(table_name):
    return translation_mapping.get(table_name, table_name)