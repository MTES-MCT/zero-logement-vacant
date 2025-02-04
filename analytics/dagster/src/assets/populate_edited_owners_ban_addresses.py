from dagster import asset, MetadataValue, AssetExecutionContext, Output, op
import requests
import pandas as pd
from io import StringIO

@asset(
  description="Return edited owners (score = 1).",
  required_resource_keys={"psycopg2_connection"}
)
def owners_with_edited_address(context: AssetExecutionContext):
    query = """
    SELECT
        o.id as owner_id,
        array_to_string(o.address_dgfip, ' ') as address_dgfip
    FROM owners o
    LEFT JOIN ban_addresses ba ON o.id = ba.ref_id
    WHERE ba.ref_id IS NOT NULL AND ba.score = 1;  -- Propriétaires avec adresse éditée par Stéphanie
    """

    try:
        with context.resources.psycopg2_connection as conn:
            df = pd.read_sql(query, conn)
    except Exception as e:
        context.log.error(f"Error executing query: {e}")
        raise

    return df

@asset(
  description="Split the owners DataFrame into multiple CSV files (chunks), store them to disk, and return the file paths as metadata.",
  required_resource_keys={"ban_config"}
)
def create_csv_chunks_from_owners(context: AssetExecutionContext, owners_with_edited_address):
    config = context.resources.ban_config

    chunk_size = config.chunk_size
    max_files = config.max_files
    disable_max_files = config.disable_max_files

    num_chunks = len(owners_with_edited_address) // chunk_size + 1

    if not disable_max_files:
        num_chunks = min(num_chunks, max_files)

    file_paths = []

    for i in range(num_chunks):
        start_idx = i * chunk_size
        end_idx = (i + 1) * chunk_size
        chunk = owners_with_edited_address.iloc[start_idx:end_idx]

        chunk_file_path = f"{config.csv_file_path}_part_{i+1}.csv"
        file_paths.append(chunk_file_path)

        chunk.to_csv(chunk_file_path, index=False, columns=["owner_id", "address_dgfip"])

        context.log.info(f"CSV file created: {chunk_file_path}")
        context.log.info(f"Preview of the CSV file:\n{chunk.head()}")
        context.log.info(f"Generated {i + 1} out of {num_chunks} files")

    return Output(value=file_paths, metadata={"file_paths": MetadataValue.text(", ".join(file_paths))})


@asset(
  description="Send each CSV chunk to the BAN address API, aggregate valid responses into a single CSV, and return the path to the aggregated CSV file.",
  required_resource_keys={"ban_config"}
)
def send_csv_chunks_to_api(context: AssetExecutionContext, create_csv_chunks_from_owners):
    config = context.resources.ban_config

    aggregated_file_path = f"{config.csv_file_path}_aggregated.csv"

    with open(aggregated_file_path, 'w') as aggregated_file:
        first_file = True

        for file_path in create_csv_chunks_from_owners:
            files = {'data': open(file_path, 'rb')}
            data = {'columns': 'address_dgfip', 'citycode': 'geo_code'}

            response = requests.post(config.api_url, files=files, data=data)

            if response.status_code == 200:
                api_data = pd.read_csv(StringIO(response.text))
                api_data.to_csv(aggregated_file, mode='a', index=False, header=first_file)
                first_file = False

                context.log.info(f"Processed file: {file_path}")
            else:
                raise Exception(f"API request failed with status code {response.status_code}")

    return aggregated_file_path

@asset(
  description="Parse the aggregated CSV from the BAN address API, insert valid owners' addresses into `ban_addresses`, and return the count of processed records.",
  required_resource_keys={"psycopg2_connection"}
)
def parse_api_response_and_insert_owners_addresses(context: AssetExecutionContext, send_csv_chunks_to_api):
    api_df = pd.read_csv(send_csv_chunks_to_api)

    filtered_df = api_df[api_df['result_status'] == 'ok']
    failed_rows = api_df[api_df['result_status'] != 'ok']
    context.log.warning(f"Number of owners with failed API results: {len(failed_rows)}")

    filtered_df = filtered_df.applymap(lambda x: None if pd.isna(x) else x)
    filtered_df['address_kind'] = "Owner"

    with context.resources.psycopg2_connection as conn:
        with conn.cursor() as cursor:
            cursor.execute("""
            CREATE TEMP TABLE temp_ban_addresses (
                ref_id TEXT,
                house_number TEXT,
                address TEXT,
                street TEXT,
                postal_code TEXT,
                city TEXT,
                latitude FLOAT,
                longitude FLOAT,
                score FLOAT,
                ban_id TEXT,
                address_kind TEXT
            );
            """)

            buffer = StringIO()
            filtered_df.to_csv(buffer, sep='\t', header=False, index=False)
            buffer.seek(0)
            cursor.copy_from(buffer, 'temp_ban_addresses', sep='\t')

            cursor.execute("""
            UPDATE ban_addresses AS ba
            SET ban_id = tba.ban_id
            FROM temp_ban_addresses AS tba
            WHERE ba.ref_id = tba.ref_id
            AND ba.address_kind = tba.address_kind;
            """)
            cursor.execute("DROP TABLE temp_ban_addresses;")

        conn.commit()

    context.log.info(f"{len(filtered_df)} valid records inserted successfully.")

    return {
        "metadata": {"num_records": MetadataValue.text(f"{len(filtered_df)} records inserted")}
    }
