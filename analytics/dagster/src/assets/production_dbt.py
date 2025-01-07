from typing import Any, Mapping
from dagster import AssetExecutionContext, AssetKey
from dagster_dbt import dbt_assets, DbtCliResource, DagsterDbtTranslator
from ..project import dbt_project


class CustomizedDagsterDbtTranslator(DagsterDbtTranslator):
    def get_asset_key(self, dbt_resource_props):
        type = dbt_resource_props["resource_type"]
        name = dbt_resource_props["name"]
        if type == "source":
            return AssetKey(f"raw_{name}")
        else:
            return super().get_asset_key(dbt_resource_props)

    def get_tags(self, dbt_resource_props: Mapping[str, Any]) -> Mapping[str, str]:
        if "marts" in dbt_resource_props["name"]:
            return {"layer": "marts", "kind": "gold"}
        elif "int" in dbt_resource_props["name"]:
            return {"layer": "intermediate", "kind": "silver"}
        elif "stg" in dbt_resource_props["name"]:
            return {"layer": "staging", "kind": "bronze"}
        elif "common" in dbt_resource_props["name"]:
            return {"layer": "common", "kind": "bronze"}
        else:
            return super().get_tags(dbt_resource_props)

    def get_group_name(self, dbt_resource_props: Mapping[str, Any]) -> str:
        type = dbt_resource_props["resource_type"]
        if type == "seed":
            return "seeds"

        if "marts" in dbt_resource_props["name"]:
            return "marts"
        elif "int" in dbt_resource_props["name"]:
            return "intermediate"
        elif "stg" in dbt_resource_props["name"]:
            return "staging"
        elif "common" in dbt_resource_props["name"]:
            return "common"
        else:
            return super().get_group_name(dbt_resource_props)


@dbt_assets(
    manifest=dbt_project.manifest_path,
    dagster_dbt_translator=CustomizedDagsterDbtTranslator(),
)
def dbt_production_assets(context: AssetExecutionContext, dbt: DbtCliResource):
    yield from dbt.cli(["build"], context=context).stream()
