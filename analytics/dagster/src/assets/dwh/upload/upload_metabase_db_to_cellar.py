from dagster import AssetKey, asset
from ..config import RESULT_TABLES, Config
from dagster_duckdb import DuckDBResource
import boto3


# Asset for uploading the DuckDB metabase file to S3
@asset(
    deps={AssetKey(f"copy_{table_name}") for table_name in RESULT_TABLES},
    group_name="upload"
)
def upload_duckdb_to_s3(duckdb_metabase: DuckDBResource):
    s3_bucket = Config.CELLAR_METABASE_BUCKET_NAME
    s3_key = Config.CELLAR_METABASE_KEY_PATH
    file_path = duckdb_metabase.database  # Path to the DuckDB metabase file

    # Initialize S3 client
    s3_client = boto3.client(
        "s3",
        aws_access_key_id=Config.CELLAR_ACCESS_KEY_ID,
        aws_secret_access_key=Config.CELLAR_SECRET_ACCESS_KEY,
        endpoint_url=Config.CELLAR_HTTP_HOST_URL

    )

    # Upload the DuckDB metabase file to S3
    with open(file_path, "rb") as f:
        s3_client.upload_fileobj(f, s3_bucket, s3_key)

    return f"Uploaded DuckDB metabase to s3://{s3_bucket}/{s3_key}"