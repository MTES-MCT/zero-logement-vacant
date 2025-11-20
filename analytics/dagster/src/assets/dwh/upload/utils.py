from ....config import Config
import boto3

def upload(source_file_path: str, s3_bucket: str, s3_key: str):
    print(f"Uploading DuckDB metabase to s3://{s3_bucket}/{s3_key}")
    print("Credentials, endpoint and region:")

    print(f"Access key ID: {Config.CELLAR_ACCESS_KEY_ID}")
    print(f"Secret access key: {Config.CELLAR_SECRET_ACCESS_KEY}")
    print(f"Endpoint URL: {Config.CELLAR_HTTP_HOST_URL}")

    # Initialize S3 client
    s3_client = boto3.client(
        "s3",
        region_name=Config.CELLAR_REGION,
        aws_access_key_id=Config.CELLAR_ACCESS_KEY_ID,
        aws_secret_access_key=Config.CELLAR_SECRET_ACCESS_KEY,
        endpoint_url=Config.CELLAR_HTTP_HOST_URL,
    )

    # Upload the DuckDB metabase file to S3
    # Using upload_file instead of upload_fileobj to avoid MissingContentLength error
    s3_client.upload_file(source_file_path, s3_bucket, s3_key)


def download(destination_file_path: str, s3_bucket: str, s3_key: str):
    print(f"Downloading DuckDB metabase from s3://{s3_bucket}/{s3_key}")
    print("Credentials, endpoint and region:")

    print(f"Access key ID: {Config.CELLAR_ACCESS_KEY_ID}")
    print(f"Secret access key: {Config.CELLAR_SECRET_ACCESS_KEY}")
    print(f"Endpoint URL: {Config.CELLAR_HTTP_HOST_URL}")

    # Initialize S3 client
    s3_client = boto3.client(
        "s3",
        region_name=Config.CELLAR_REGION,
        aws_access_key_id=Config.CELLAR_ACCESS_KEY_ID,
        aws_secret_access_key=Config.CELLAR_SECRET_ACCESS_KEY,
        endpoint_url=Config.CELLAR_HTTP_HOST_URL,
    )

    # Download the DuckDB metabase file from S3
    with open(destination_file_path, "wb") as f:
        s3_client.download_fileobj(s3_bucket, s3_key, f)
