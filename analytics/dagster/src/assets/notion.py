from dagster import AssetExecutionContext
from dagster_embedded_elt.dlt import DagsterDltResource, dlt_assets
from dlt import pipeline

from ..dlt_sources.notion import notion_databases

@dlt_assets(
    dlt_source=notion_databases(database_ids=[{"id": "a57fc47a6e3b4ebd835cf0d7a5460e29"}], api_key="secret_kU0GYOB4NMjni8ObBrrVspQkZTcmlUgZ3YdguzwubBP"),
    dlt_pipeline=pipeline(
        pipeline_name="notion",
        dataset_name="notion_dataset",
        destination="duckdb",
        progress="log",
    ),
    name="notion_asset",
    group_name="notion",
)
def dagster_notion_assets(context: AssetExecutionContext, dlt: DagsterDltResource):
    yield from dlt.run(context=context)