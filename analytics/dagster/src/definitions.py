from pathlib import Path
from dagster import (
    AssetSelection,
    Definitions,
    ScheduleDefinition,
    define_asset_job,
    load_assets_from_modules,
)

from .assets import dagster_production_assets
from dagster_embedded_elt.dlt import DagsterDltResource
from dagster_dbt import DbtCliResource

import warnings
import dagster

from .project import dbt_project
from .assets import production_dbt
from .assets.notion import dagster_notion_assets
from .assets import populate_owners_ban_addresses

from .resources.ban_config import ban_config_resource
from .jobs.owners_ban_addresses_job import owners_ban_addresses_job

warnings.filterwarnings("ignore", category=dagster.ExperimentalWarning)

dbt_analytics_assets = load_assets_from_modules(modules=[production_dbt]) # Load the assets from the file

# Initialize DLT resource
dlt_resource = DagsterDltResource(
    name="dlt",
    group_name="production",
)

dbt_resource = DbtCliResource(
    project_dir=dbt_project,
)

# Define job for running all assets
daily_refresh_job = define_asset_job(
    name="production_job",
    #selection=[""]
)

# Schedule the job to run daily at midnight
daily_refresh_schedule = ScheduleDefinition(
    job=daily_refresh_job,
    cron_schedule="0 0 * * *"
)

# Load definitions with assets, resources, and schedule
defs = Definitions(
    assets=[
        dagster_production_assets,
        dagster_notion_assets,
        # dagster_notion_assets,
        *dbt_analytics_assets,
        populate_owners_ban_addresses
    ],
    resources={
        "dlt": dlt_resource,
        "dbt": dbt_resource,
        "ban_config": ban_config_resource
    },
    schedules=[
        daily_refresh_schedule,
    ],
    jobs=[owners_ban_addresses_job]
)
