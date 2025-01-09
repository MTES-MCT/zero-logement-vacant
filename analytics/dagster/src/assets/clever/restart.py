import subprocess
from dagster import asset
from ...config import Config

@asset(group_name="deployment", deps=["upload_duckdb_to_s3"], name="clevercloud_login_and_restart")
def clevercloud_login_and_restart():

    # Log in to Clever Cloud using environment variables
    login_command = ["clever", "login", "--token", Config.CLEVER_TOKEN, "--secret", Config.CLEVER_SECRET]
    subprocess.run(login_command, check=True)

    # Restart the application
    restart_command = ["clever", "restart", "--app", Config.METABASE_APP_ID]
    subprocess.run(restart_command, check=True)

    return f"Application {Config.METABASE_APP_ID} has been restarted."
