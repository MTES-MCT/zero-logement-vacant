from .....config import Config


SCHEMA = "production"


production_tables = {
    "buildings": f"CREATE OR REPLACE table {SCHEMA}.buildings AS (SELECT * FROM zlv_replication_db.public.buildings );",
    "owners": f"CREATE OR REPLACE table {SCHEMA}.owners AS (SELECT * FROM zlv_replication_db.public.owners );",
    "housing": f"CREATE OR REPLACE table {SCHEMA}.housing AS (SELECT * FROM zlv_replication_db.public.fast_housing );",
    "owners_housing": f"CREATE OR REPLACE table {SCHEMA}.owners_housing AS (SELECT * FROM zlv_replication_db.public.owners_housing );",
    "events": f"CREATE OR REPLACE table {SCHEMA}.events AS (SELECT * FROM zlv_replication_db.public.events );",
    "housing_events": f"CREATE OR REPLACE table {SCHEMA}.housing_events AS (SELECT * FROM zlv_replication_db.public.housing_events );",
    "establishments": f"CREATE OR REPLACE table {SCHEMA}.establishments AS (SELECT * FROM zlv_replication_db.public.establishments );",
    "users": f"CREATE OR REPLACE table {SCHEMA}.users AS (SELECT * FROM zlv_replication_db.public.users );",
    "campaigns_housing": f"CREATE OR REPLACE table {SCHEMA}.campaigns_housing AS (SELECT * FROM zlv_replication_db.public.campaigns_housing );",
    "campaigns": f"CREATE OR REPLACE table {SCHEMA}.campaigns AS (SELECT * FROM zlv_replication_db.public.campaigns );",
    "group_housing_events": f"CREATE OR REPLACE table {SCHEMA}.group_housing_events AS (SELECT * FROM zlv_replication_db.public.group_housing_events );",
    "groups": f"CREATE OR REPLACE table {SCHEMA}.groups AS (SELECT * FROM zlv_replication_db.public.groups );",
    "groups_housing": f"CREATE OR REPLACE table {SCHEMA}.groups_housing AS (SELECT * FROM zlv_replication_db.public.groups_housing );",
    "geo_perimeters": f"CREATE OR REPLACE table {SCHEMA}.geo_perimeters AS (SELECT id, establishment_id, name, kind, created_at, created_by FROM zlv_replication_db.public.geo_perimeters );",
    "old_events": f"""
        CREATE OR REPLACE TABLE {SCHEMA}.old_events AS (
        SELECT * FROM read_csv('s3://{Config.CELLAR_DATA_LAKE_BUCKET_NAME}/lake/production/old_events.csv', auto_detect = TRUE));""",
}
