from dagster import AssetKey, asset
from ....config import RESULT_TABLES, Config
from .utils import upload

from dagster_duckdb import DuckDBResource
import boto3


# Asset for uploading the DuckDB metabase file to S3
@asset(
    name="upload_duckdb_to_s3",
    deps=[AssetKey("export_mother_duck_local_duckdb")],
    group_name="upload",
)
def upload_duckdb_to_s3(context, duckdb_local_metabase: DuckDBResource):
    s3_bucket = Config.CELLAR_METABASE_BUCKET_NAME
    s3_key = Config.CELLAR_METABASE_KEY_PATH
    file_path = duckdb_local_metabase.database # Path to the DuckDB metabase file
    if Config.USE_MOTHER_DUCK_FOR_METABASE:
        context.log.info("Not uploading local because we use MotherDuck")
    else:
        context.log.info(f"Start uploading local duckdb {file_path} to metabase s3 on {s3_key}")
        upload(file_path, s3_bucket, s3_key)

    return f"Uploaded DuckDB metabase to s3://{s3_bucket}/{s3_key}"
