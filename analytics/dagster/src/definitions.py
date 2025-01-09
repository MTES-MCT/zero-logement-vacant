from dagster import (
    AssetSelection,
    Definitions,
    ScheduleDefinition,
    define_asset_job,
    load_assets_from_modules,
)

# from .assets import dagster_production_assets
from .assets import dwh


# from dagster_embedded_elt.dlt import DagsterDltResource
from dagster_dbt import DbtCliResource
from dagster_duckdb import DuckDBResource

import warnings
import dagster

from .project import dbt_project
from .assets import production_dbt
from .assets import clever

from .assets.dwh.ingest.ingest_lovac_ff_s3_asset import (
    import_cerema_ff_lovac_data_from_s3_to_duckdb,
)
from .assets.dwh.checks.ff_table_exists import check_ff_lovac_on_duckdb
from .assets.dwh.ingest.ingest_lovac_ff_s3_asset import setup_s3_connection
from .assets.dwh.upload.upload_ff_db_to_cellar import upload_ff_to_s3

clever_assets_assets = load_assets_from_modules(modules=[clever])

warnings.filterwarnings("ignore", category=dagster.ExperimentalWarning)

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
            setup_s3_connection,
            check_ff_lovac_on_duckdb,
            import_cerema_ff_lovac_data_from_s3_to_duckdb,
            "upload_ff_to_s3",
            "download_ff_from_s3",
            ]
    ),
)

yearly_update_ff_dwh_job = define_asset_job(
    name="datawarehouse_build_ff_data",
    selection=AssetSelection.assets(
        *[
            "setup_duckdb",
            setup_s3_connection,
            import_cerema_ff_lovac_data_from_s3_to_duckdb,
            upload_ff_to_s3
        ]
    ),
)

daily_refresh_schedule = ScheduleDefinition(
    job=daily_update_dwh_job, cron_schedule="@daily"
)

yearly_ff_refresh_schedule = ScheduleDefinition(
    job=yearly_update_ff_dwh_job, cron_schedule="0 0 1 1 *"
)

# Load definitions with assets, resources, and schedule
defs = Definitions(
    assets=[
        # dagster_production_assets,
        # dagster_notion_assets,
        # dagster_notion_assets,
        *dwh_assets,
        *dbt_analytics_assets,
        *clever_assets_assets
    ],
    resources={
        # "dlt": dlt_resource,
        "dbt": dbt_resource,
        "duckdb": DuckDBResource(
            database="db/dagster.duckdb",  # required
        ),
        "duckdb_metabase": DuckDBResource(
            database="db/duckdb_metabase.duckdb",  # required
        ),
    },
    schedules=[daily_refresh_schedule, yearly_ff_refresh_schedule],
)
