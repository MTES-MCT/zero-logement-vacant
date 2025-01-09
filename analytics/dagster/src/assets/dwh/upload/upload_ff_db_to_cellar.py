from dagster import AssetKey, asset
from ....config import RESULT_TABLES, Config
from .utils import upload
from ..ingest.queries.lovac import lovac_tables_sql
from ..ingest.queries.ff import ff_tables_sql
from dagster_duckdb import DuckDBResource
import boto3


# Asset for uploading the DuckDB metabase file to S3
all_tables_sql = {**lovac_tables_sql, **ff_tables_sql}

@asset(
    name="upload_ff_to_s3",
    deps={AssetKey(f"build_{table_name}") for table_name in all_tables_sql.keys()},
    group_name="upload",
)
def upload_ff_to_s3(duckdb: DuckDBResource):
    s3_bucket = Config.CELLAR_DATA_LAKE_BUCKET_NAME
    s3_key = Config.CELLAR_STATE_FF_LOVAC_KEY_PATH
    file_path = duckdb.database  # Path to the DuckDB metabase file

    upload(file_path, s3_bucket, s3_key)

    return f"Uploaded DuckDB metabase to s3://{s3_bucket}/{s3_key}"
