from dagster import asset, MetadataValue, AssetExecutionContext
import requests
import pandas as pd
import psycopg2
from io import StringIO
from sqlalchemy import create_engine

@asset(description="Return housing records from `fast_housing` that have no matching entry in `ban_addresses`.", required_resource_keys={"ban_config"})
def housings_without_address(context: AssetExecutionContext):
    config = context.resources.ban_config

    query = """
    SELECT fh.id as housing_id, array_to_string(fh.address_dgfip, ' ') as address_dgfip, fh.geo_code
    FROM fast_housing fh
    LEFT JOIN ban_addresses ba ON fh.id = ba.ref_id
    WHERE ba.ref_id IS NULL;
    """

    conn = psycopg2.connect(
        dbname=config.db_name,
        user=config.db_user,
        password=config.db_password,
        host=config.db_host,
        port=config.db_port,
    )
    df = pd.read_sql(query, conn)
    conn.close()

    return df


@asset(description="Write housing records without addresses to a CSV file, log the file path and a preview, then return the file path as metadata.", required_resource_keys={"ban_config"})
def create_csv_from_housings(context: AssetExecutionContext, housings_without_address):
    config = context.resources.ban_config

    csv_file_path = f"{config.csv_file_path}/search.csv"
    housings_without_address.to_csv(csv_file_path, index=False, columns=["housing_id","address_dgfip", "geo_code"])

    context.log.info(f"CSV file created at: {csv_file_path}")

    df = pd.read_csv(csv_file_path)
    pd.set_option('display.max_columns', None)
    pd.set_option('display.max_rows', None)
    pd.set_option('display.width', None)
    context.log.info(f"Preview of the CSV file:\n{df.head()}")

    return {
        "metadata": {"file_path": MetadataValue.text(csv_file_path)}
    }


@asset(deps=[create_csv_from_housings], description="Send the local CSV file to the BAN address API for address processing. Raises an exception if the request fails.", required_resource_keys={"ban_config"})
def send_csv_to_api(context: AssetExecutionContext):
    config = context.resources.ban_config

    files = {'data': open(f"{config.csv_file_path}/search.csv", 'rb')}

    data = {'columns': 'address_dgfip', 'citycode': 'geo_code'}

    response = requests.post(config.api_url, files=files, data=data)

    if response.status_code == 200:
        return response.text
    else:
        raise Exception(f"API request failed with status code {response.status_code}")


@asset(description="Parse the CSV response from the BAN address API, insert valid addresses into the `ban_addresses` table, log a preview and any failed results, then return the total number of inserted records as metadata.", required_resource_keys={"ban_config"})
def parse_api_response_and_insert_housing_addresses(context: AssetExecutionContext, send_csv_to_api):
    config = context.resources.ban_config

    api_df = pd.read_csv(StringIO(send_csv_to_api))

    filtered_df = api_df[api_df['result_status'] == 'ok']
    failed_rows = api_df[api_df['result_status'] != 'ok']
    context.log.warning(f"Number of housings with failed API results: {len(failed_rows)}")

    filtered_df = filtered_df.applymap(lambda x: None if pd.isna(x) else x)

    engine = create_engine(f'postgresql://{config.db_user}:{config.db_password}@{config.db_host}:{config.db_port}/{config.db_name}')

    filtered_df.to_sql(
        'ban_addresses',
        engine,
        if_exists='append',
        index=False,
        columns=[
            'housing_id',
            'result_housenumber',
            'result_label',
            'result_street',
            'result_postcode',
            'result_city',
            'latitude',
            'longitude',
            'result_score',
            'result_id',
            'address_kind'
        ],
        dtype={
            'housing_id': 'INTEGER',
            'result_housenumber': 'TEXT',
            'result_label': 'TEXT',
            'result_street': 'TEXT',
            'result_postcode': 'TEXT',
            'result_city': 'TEXT',
            'latitude': 'FLOAT',
            'longitude': 'FLOAT',
            'result_score': 'FLOAT',
            'result_id': 'TEXT',
            'address_kind': 'TEXT'
        }
    )

    context.log.info(f"{len(api_df)} records inserted successfully.")

    return {
        "metadata": {"num_records": MetadataValue.text(f"{len(api_df)} records inserted")}
    }
