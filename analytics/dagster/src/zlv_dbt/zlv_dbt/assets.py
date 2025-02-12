from dagster import AssetExecutionContext
from dagster_dbt import DbtCliResource, dbt_assets

from .constants import dbt_manifest_path


@dbt_assets(manifest=dbt_manifest_path)
def zlv_dbt_project_dbt_assets(context: AssetExecutionContext, dbt: DbtCliResource):
    yield from dbt.cli(["debug", "--config-dir"], context=context).stream()

    yield from dbt.cli(["build", "--full-refresh"], context=context).stream()
