from dagster import asset, MetadataValue, AssetExecutionContext, resource, op
import requests
import pandas as pd
from io import StringIO
import os
from datetime import datetime

CSV_FILE_NAME = "search_housings.csv"

@asset(
  description="Return housing records from `fast_housing` that have no matching entry in `ban_addresses`.",
  required_resource_keys={"psycopg2_connection"}
)
def housings_without_address(context: AssetExecutionContext):
    query = """
    SELECT fh.id as housing_id, array_to_string(fh.address_dgfip, ' ') as address_dgfip, fh.geo_code
    FROM fast_housing fh
    LEFT JOIN ban_addresses ba ON fh.id = ba.ref_id
    WHERE ba.ref_id IS NULL;
    """

    try:
        with context.resources.psycopg2_connection as conn:
            df = pd.read_sql(query, conn)
    except Exception as e:
        context.log.error(f"Error executing query: {e}")
        raise

    return df

@asset(
  description="Write housing records without addresses to a CSV file, log the file path and a preview, then return the file path as metadata.",
  required_resource_keys={"ban_config"}
)
def create_csv_from_housings(context: AssetExecutionContext, housings_without_address):
    config = context.resources.ban_config

    csv_dir = config.csv_file_path
    csv_file_path = os.path.join(csv_dir, CSV_FILE_NAME)
    os.makedirs(csv_dir, exist_ok=True)

    housings_without_address.to_csv(csv_file_path, index=False, columns=["housing_id","address_dgfip", "geo_code"])

    context.log.info(f"CSV file created at: {csv_file_path}")

    return {
        "metadata": {"file_path": MetadataValue.text(csv_file_path)}
    }

@asset(
  deps=[create_csv_from_housings], description="Send the local CSV file to the BAN address API for address processing. Raises an exception if the request fails.",
  required_resource_keys={"ban_config"}
)
def send_csv_to_api(context: AssetExecutionContext):
    config = context.resources.ban_config

    csv_file_path = os.path.join(config.csv_file_path, CSV_FILE_NAME)
    files = {'data': open(csv_file_path, 'rb')}

    data = {'columns': 'address_dgfip', 'citycode': 'geo_code'}

    response = requests.post(config.api_url, files=files, data=data)

    if response.status_code == 200:
        return response.text
    else:
        raise Exception(f"API request failed with status code {response.status_code}")


@asset(
  description="Parse the CSV response from the BAN address API, insert valid addresses into the `ban_addresses` table, log a preview and any failed results, then return the total number of inserted records as metadata.",
  required_resource_keys={"psycopg2_connection"}
)
def parse_api_response_and_insert_housing_addresses(context: AssetExecutionContext, send_csv_to_api):
    api_df = pd.read_csv(StringIO(send_csv_to_api))

    filtered_df = api_df[api_df['result_status'] == 'ok']
    failed_rows = api_df[api_df['result_status'] != 'ok']
    context.log.warning(f"Number of housings with failed API results: {len(failed_rows)}")
    if not failed_rows.empty:
        context.log.warning(f"Failed rows preview:\n{failed_rows.head(5)}")

    filtered_df = filtered_df.applymap(lambda x: None if pd.isna(x) else x)
    filtered_df['address_kind'] = "Housing"

    context.log.info(filtered_df.columns)

    filtered_df = filtered_df.rename(columns={
        'housing_id': 'ref_id',
        'result_housenumber': 'house_number',
        'result_label': 'address',
        'result_street': 'street',
        'result_postcode': 'postal_code',
        'result_city': 'city',
        'latitude': 'latitude',
        'longitude': 'longitude',
        'result_score': 'score',
        'result_id': 'ban_id',
        'address_kind': 'address_kind'
    })
    filtered_df['last_updated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

    columns = [
        'ref_id', 'house_number', 'address', 'street', 'postal_code', 'city',
        'latitude', 'longitude', 'score', 'ban_id', 'address_kind', 'last_updated_at'
    ]

    filtered_df = filtered_df[columns]

    with context.resources.psycopg2_connection as conn, conn.cursor() as cursor:
        buffer = StringIO()
        filtered_df.to_csv(buffer, sep='\t', header=False, index=False)
        buffer.seek(0)

        cursor.copy_from(buffer, 'ban_addresses', sep='\t', columns=columns)

        conn.commit()

    context.log.info(f"{len(filtered_df)} valid records inserted successfully.")

    return {
        "metadata": {"num_records": MetadataValue.text(f"{len(filtered_df)} records inserted")}
    }
