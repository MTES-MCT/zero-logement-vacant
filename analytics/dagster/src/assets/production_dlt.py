from typing import Iterable
from dagster import AssetExecutionContext, AssetKey
from dagster_embedded_elt.dlt import DagsterDltResource, dlt_assets, DagsterDltTranslator
from dlt import pipeline
from dlt.extract.resource import DltResource

from ..dlt_sources.sources import get_production_source

class CustomDagsterDltTranslator(DagsterDltTranslator):
    def get_asset_key(self, resource: DagsterDltResource) -> AssetKey:
        """Overrides asset key to be the dlt resource name."""
        return AssetKey(f"raw_{resource.name}")

    def get_deps_asset_keys(self, resource: DltResource) -> Iterable[AssetKey]:
        return AssetKey(f"raw_{resource.name}")

@dlt_assets(
    dlt_source=get_production_source(),
    dlt_pipeline=pipeline(
        pipeline_name="production",
        dataset_name="production_dataset",
        destination="duckdb",
        progress="log",
    ),
    name="production_asset",
    group_name="production",
    dagster_dlt_translator=CustomDagsterDltTranslator(),
)
def dagster_production_assets(context: AssetExecutionContext, dlt: DagsterDltResource):
    yield from dlt.run(context=context)