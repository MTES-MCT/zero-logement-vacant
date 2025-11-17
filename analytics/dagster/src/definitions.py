
from dagster import (
    AssetSelection,
    Definitions,
    RetryPolicy,
    ScheduleDefinition,
    define_asset_job,
    load_assets_from_modules,
)

from .assets.dwh.copy.copy_to_clean_duckdb import copy_dagster_duckdb_to_metabase_duckdb
from .assets.dwh.copy.transfer_database import export_mother_duck_local_duckdb

# from .assets import dagster_production_assets
from .assets import dwh
from .config import Config

# from dagster_embedded_elt.dlt import DagsterDltResource
from dagster_dbt import DbtCliResource
from dagster_duckdb import DuckDBResource

import warnings
import dagster

from .project import dbt_project
from .assets import production_dbt

from .assets.populate_owners_ban_addresses import process_and_insert_owners
from .assets.populate_edited_owners_ban_addresses import process_and_update_edited_owners
from .assets.populate_housings_ban_addresses import housings_without_address_csv, process_housings_with_api
from .assets.populate_missing_ban_addresses_for_owners import populate_missing_ban_addresses_for_owners
from .resources.ban_config import ban_config_resource
from .resources.database_resources import psycopg2_connection_resource

from .assets import clever

from .assets.dwh.ingest.ingest_external_sources_asset import (
    setup_external_schema,
    import_all_external_sources,
)
from .assets.dwh.ingest.queries.external_sources_config import EXTERNAL_SOURCES
from .assets.dwh.checks.ff_table_exists import check_ff_lovac_on_duckdb
from .assets.dwh.upload.upload_ff_db_to_cellar import upload_ff_to_s3

# Note: These are imported for use in job definitions, but assets are loaded via load_assets_from_modules

clever_assets_assets = load_assets_from_modules(modules=[clever])

dbt_analytics_assets = load_assets_from_modules(
    modules=[production_dbt]
)  # Load the assets from the file
dwh_assets = load_assets_from_modules(modules=[dwh])  # Load the assets from the file


dbt_resource = DbtCliResource(
    project_dir=dbt_project,
)

# Define job for running all assets
daily_update_dwh_job = define_asset_job(
    name="datawarehouse_synchronize_and_build",
    selection=AssetSelection.assets(*[*dwh_assets, *dbt_analytics_assets, *["setup_duckdb", "clevercloud_login_and_restart"]])
    - AssetSelection.assets(
        *[
            setup_external_schema,
            check_ff_lovac_on_duckdb,
            import_all_external_sources,
            copy_dagster_duckdb_to_metabase_duckdb,
            export_mother_duck_local_duckdb,
            "upload_ff_to_s3",
            "download_ff_from_s3",
            ]
    ),
)

# Unified job for all external data sources (CEREMA, INSEE, DGALN, URSSAF, DGFIP)
# Dynamically includes all sources defined in EXTERNAL_SOURCES
yearly_update_all_external_sources_job = define_asset_job(
    name="datawarehouse_load_all_external_sources",
    selection=AssetSelection.assets(
        "setup_duckdb",
        setup_external_schema,
        *list(EXTERNAL_SOURCES.keys()),  # Dynamically include all external sources
        upload_ff_to_s3
    ),
    description="Load all external data sources (CEREMA FF/LOVAC, INSEE, DGALN, URSSAF, DGFIP)",
)

daily_refresh_schedule = ScheduleDefinition(
    job=daily_update_dwh_job, cron_schedule="@daily"
)

yearly_external_sources_refresh_schedule = ScheduleDefinition(
    job=yearly_update_all_external_sources_job, 
    cron_schedule="@yearly",
    description="Annual refresh of all external data sources"
)

owners_asset_job = define_asset_job(
    name="populate_owners_addresses",
    selection=AssetSelection.assets(
        "process_and_insert_owners",
    ),
)

edited_owners_asset_job = define_asset_job(
    name="populate_edited_owners_addresses",
    selection=AssetSelection.assets(
        "process_and_update_edited_owners",
    ),
)

missing_ban_addresses_asset_job_for_owners = define_asset_job(
    name="missing_ban_addresses_asset_job_for_owners",
    selection=AssetSelection.assets(
        "populate_missing_ban_addresses_for_owners",
    ),
)

housings_asset_job = define_asset_job(
    name="populate_housings_addresses",
    selection=AssetSelection.assets(
        "housings_without_address_csv",
        "process_housings_with_api",
    ),
)

# Load definitions with assets, resources, and schedule
defs = Definitions(
    assets=[
        # dagster_production_assets,
        # dagster_notion_assets,
        # dagster_notion_assets,
        process_and_insert_owners,
        populate_missing_ban_addresses_for_owners,
        process_and_update_edited_owners,
        housings_without_address_csv, process_housings_with_api,
        *dwh_assets,  # This already includes setup_external_schema and import_all_external_sources
        *dbt_analytics_assets,
        *clever_assets_assets,
    ],
    resources={
        # "dlt": dlt_resource,
        "dbt": dbt_resource,
        "duckdb": DuckDBResource(
            database=f"md:dwh?motherduck_token={Config.MD_TOKEN}" if Config.USE_MOTHER_DUCK else "db/dagster.duckdb",
        ),
        "duckdb_metabase": DuckDBResource(
            database=f"md:metabase?motherduck_token={Config.MD_TOKEN}",
        ),
        "duckdb_local_metabase": DuckDBResource(
            database="db/metabase.duckdb",
        ),
        "ban_config": ban_config_resource,
        "psycopg2_connection": psycopg2_connection_resource,
    },
    schedules=[
        daily_refresh_schedule, 
        yearly_external_sources_refresh_schedule
    ],
    jobs=[
        owners_asset_job, 
        edited_owners_asset_job, 
        housings_asset_job, 
        missing_ban_addresses_asset_job_for_owners,
        yearly_update_all_external_sources_job,
    ],
)
