from dagster import AssetKey, asset
from ....config import RESULT_TABLES, Config
from .utils import upload
from ..ingest.queries.external_sources_config import get_sources_by_producer
from dagster_duckdb import DuckDBResource
import boto3


# Get all CEREMA sources for dependency management
cerema_sources = get_sources_by_producer("CEREMA")

@asset(
    name="upload_ff_to_s3",
    deps={AssetKey(source_name) for source_name in cerema_sources.keys()},
    group_name="upload",
)
def upload_ff_to_s3(duckdb: DuckDBResource):
    s3_bucket = Config.CELLAR_DATA_LAKE_BUCKET_NAME
    s3_key = Config.CELLAR_STATE_FF_LOVAC_KEY_PATH
    file_path = duckdb.database  # Path to the DuckDB metabase file

    upload(file_path, s3_bucket, s3_key)

    return f"Uploaded DuckDB metabase to s3://{s3_bucket}/{s3_key}"
