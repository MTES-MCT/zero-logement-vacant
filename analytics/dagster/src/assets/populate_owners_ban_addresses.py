from dagster import asset, Config, MetadataValue, AssetExecutionContext, Output
import requests
import pandas as pd
import psycopg2
from io import StringIO

class BANConfig(Config):
    db_name: str = "isoprod"
    db_user: str = "postgres"
    db_password: str = "postgres"
    db_host: str = "localhost"
    db_port: str = "5432"
    api_url: str = "https://api-adresse.data.gouv.fr/search/csv/"
    csv_file_path: str = "temp_csv"
    chunk_size: int = 10000
    max_files: int = 5
    disable_max_files: bool = False

@asset(description="Return owners with no BAN address or a non-validated BAN address (score < 1).", required_resource_keys={"ban_config"})
def owners_without_address(context: AssetExecutionContext):
    config = context.resources.ban_config

    query = """
    SELECT
        o.id as owner_id,
        array_to_string(o.address_dgfip, ' ') as address_dgfip
    FROM owners o
    LEFT JOIN ban_addresses ba ON o.id = ba.ref_id
    WHERE (ba.ref_id IS NULL)  -- Propriétaires sans adresse
       OR (ba.ref_id IS NOT NULL AND ba.address_kind = 'Owner' AND ba.score < 1);  -- Propriétaires avec adresse non validée par Stéphanie
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

@asset(description="Split the owners DataFrame into multiple CSV files (chunks), store them to disk, and return the file paths as metadata.", required_resource_keys={"ban_config"})
def create_csv_chunks_from_owners(context: AssetExecutionContext, owners_without_address):
    config = context.resources.ban_config

    chunk_size = config.chunk_size
    max_files = config.max_files
    disable_max_files = config.disable_max_files

    num_chunks = len(owners_without_address) // chunk_size + 1

    if not disable_max_files:
        num_chunks = min(num_chunks, max_files)

    file_paths = []

    for i in range(num_chunks):
        start_idx = i * chunk_size
        end_idx = (i + 1) * chunk_size
        chunk = owners_without_address.iloc[start_idx:end_idx]

        chunk_file_path = f"{config.csv_file_path}_part_{i+1}.csv"
        file_paths.append(chunk_file_path)

        chunk.to_csv(chunk_file_path, index=False, columns=["owner_id", "address_dgfip"])

        context.log.info(f"CSV file created: {chunk_file_path}")
        context.log.info(f"Preview of the CSV file:\n{chunk.head()}")
        context.log.info(f"Generated {i + 1} out of {num_chunks} files")

    return Output(value=file_paths, metadata={"file_paths": MetadataValue.text(", ".join(file_paths))})


@asset(description="Send each CSV chunk to the BAN address API, aggregate valid responses into a single CSV, and return the path to the aggregated CSV file.", required_resource_keys={"ban_config"})
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

@asset(description="Parse the aggregated CSV from the BAN address API, insert valid owners' addresses into `ban_addresses`, and return the count of processed records.", required_resource_keys={"ban_config"})
def parse_api_response_and_insert_owners_addresses(context: AssetExecutionContext, send_csv_chunks_to_api):
    config = context.resources.ban_config

    api_df = pd.read_csv(send_csv_chunks_to_api)

    pd.set_option('display.max_columns', None)
    pd.set_option('display.max_rows', None)
    pd.set_option('display.width', None)
    context.log.info(f"Preview of the aggregated CSV file:\n{api_df.head()}")

    conn = psycopg2.connect(
        dbname=config.db_name,
        user=config.db_user,
        password=config.db_password,
        host=config.db_host,
        port=config.db_port,
    )
    cursor = conn.cursor()

    filtered_df = api_df[api_df['result_status'] == 'ok']
    failed_rows = api_df[api_df['result_status'] != 'ok']
    context.log.warning(f"Number of owners with failed API results: {len(failed_rows)}")

    for _, row in filtered_df.iterrows():
        # L'API BAN renvoie des valeurs NaN pour les champs vides. Par exemple pour les lieux-dits il n'y a pas de numéro de rue ni de rue
        row = row.apply(lambda x: None if pd.isna(x) else x)

        cursor.execute(
            """
            INSERT INTO ban_addresses (ref_id, house_number, address, street, postal_code, city, latitude, longitude, score, ban_id, address_kind)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (ref_id, address_kind)
            DO UPDATE SET
                house_number = EXCLUDED.house_number,
                address = EXCLUDED.address,
                street = EXCLUDED.street,
                postal_code = EXCLUDED.postal_code,
                city = EXCLUDED.city,
                latitude = EXCLUDED.latitude,
                longitude = EXCLUDED.longitude,
                score = EXCLUDED.score,
                ban_id = EXCLUDED.ban_id;
            """,
            (
                row['owner_id'],
                row['result_housenumber'],
                row['result_label'],
                row['result_street'],
                row['result_postcode'],
                row['result_city'],
                row['latitude'],
                row['longitude'],
                row['result_score'],
                row['result_id'],
                "Owner"
            ),
        )

    conn.commit()
    cursor.close()
    conn.close()

    context.log.info(f"{len(api_df)} records inserted successfully.")

    return {
        "metadata": {"num_records": MetadataValue.text(f"{len(api_df)} records inserted")}
    }
