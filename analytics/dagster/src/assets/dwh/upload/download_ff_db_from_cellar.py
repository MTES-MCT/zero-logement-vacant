from dagster import asset
from ....config import Config
from .utils import download

from dagster_duckdb import DuckDBResource

# Asset for uploading the DuckDB metabase file to S3
@asset(
    name="download_ff_from_s3",
    group_name="upload",
)
def download_ff_from_s3(duckdb: DuckDBResource):
    s3_bucket = Config.CELLAR_DATA_LAKE_BUCKET_NAME
    s3_key = Config.CELLAR_STATE_FF_LOVAC_KEY_PATH
    file_path = duckdb.database  # Path to the DuckDB metabase file

    download(file_path, s3_bucket, s3_key)

    return f"Uploaded DuckDB metabase to s3://{s3_bucket}/{s3_key}"
