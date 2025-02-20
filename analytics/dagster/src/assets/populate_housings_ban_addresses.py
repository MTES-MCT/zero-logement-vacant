from dagster import asset, MetadataValue, AssetExecutionContext, Output
import requests
import pandas as pd
import pyarrow as pa
import pyarrow.csv as pacsv
from io import StringIO, BytesIO
import time
import os
import glob

def delete_csv_files_with_prefix(prefix):
    files_to_delete = glob.glob(f"{prefix}*.csv")
    for file_path in files_to_delete:
        try:
            os.remove(file_path)
            print(f"Deleted: {file_path}")
        except Exception as e:
            print(f"Error deleting {file_path}: {e}")

CSV_FILE_NAME = "search_housings.csv"

@asset(
    description="Return housing records from `fast_housing` that have no matching entry in `ban_addresses` and split them into multiple CSV files.",
    required_resource_keys={"psycopg2_connection", "ban_config"}
)
def housings_without_address_csv(context: AssetExecutionContext):
    config = context.resources.ban_config
    chunk_size = config.chunk_size
    max_files = config.max_files
    disable_max_files = config.disable_max_files
    query = f"""
    SELECT fh.id as housing_id, array_to_string(fh.address_dgfip, ' ') as address_dgfip, fh.geo_code
    FROM fast_housing fh
    LEFT JOIN ban_addresses ba ON fh.id = ba.ref_id
    WHERE ba.ban_id IS NULL
    {"LIMIT " + str(max_files * chunk_size) if not disable_max_files else ""}
    ;
    """
    context.log.info(f"Limit applied: {'LIMIT ' + str(max_files * chunk_size) if not disable_max_files else 'No limit'}")

    output_prefix = "housings_without_address_part_"
    file_paths = []
    chunk_count = 0

    context.log.info(f"Cleaning up old CSV files with prefix: {output_prefix}")
    delete_csv_files_with_prefix(output_prefix)

    try:
      with context.resources.psycopg2_connection as conn:
        for chunk in pd.read_sql_query(query, conn, chunksize=chunk_size):
          if not disable_max_files and chunk_count >= max_files:
              break

          chunk_file_path = f"{output_prefix}{chunk_count + 1}.csv"
          file_paths.append(chunk_file_path)

          table = pa.Table.from_pandas(chunk)
          pacsv.write_csv(table, chunk_file_path)

          context.log.info(f"CSV file created: {chunk_file_path}")
          chunk_count += 1

    except Exception as e:
        context.log.error(f"Error executing query or writing CSV: {e}")
        raise

    return Output(value=file_paths, metadata={"file_paths": MetadataValue.text(", ".join(file_paths))})

@asset(
    description="Retrieve housing records, send them to the BAN API, and insert valid responses into the database in real-time.",
    required_resource_keys={"psycopg2_connection", "ban_config"}
)
def process_housings_with_api(context: AssetExecutionContext, housings_without_address_csv):
    config = context.resources.ban_config
    file_paths = housings_without_address_csv
    total_inserted = 0
    total_failed = 0
    batch_number = 1

    try:
      with context.resources.psycopg2_connection as conn, conn.cursor() as cursor:
        cursor.execute("""
            CREATE TEMP TABLE temp_ban_addresses (
                ref_id UUID,
                house_number TEXT,
                address TEXT,
                street TEXT,
                postal_code TEXT,
                city TEXT,
                latitude FLOAT,
                longitude FLOAT,
                score FLOAT,
                ban_id TEXT,
                address_kind TEXT,
                last_updated_at TIMESTAMP
            ) ON COMMIT DROP;
        """
        )

        for file_path in file_paths:
          context.log.info(f"Processing: {file_path}")
          with open(file_path, 'rb') as file:
            files = {'data': (file_path, file, 'text/csv')}
            data = {'columns': 'address_dgfip', 'citycode': 'geo_code'}
            response = requests.post(config.api_url, files=files, data=data)
          time.sleep(1)

          if response.status_code == 200:
            api_data = pd.read_csv(BytesIO(response.content))
            valid_df = api_data[api_data['result_status'] == 'ok'].copy()
            failed_count = len(api_data) - len(valid_df)
            total_failed += failed_count

            context.log.info(f"API data: {api_data}")

            if failed_count > 0:
              context.log.warning(f"Batch {batch_number}: {failed_count} housings with failed API results")
            else:
              context.log.info(f"Batch {batch_number}: All housings processed successfully")

            valid_df['address_kind'] = "Housing"
            valid_df = valid_df.rename(columns={
                'housing_id': 'ref_id',
                'result_housenumber': 'house_number',
                'result_label': 'address',
                'result_street': 'street',
                'result_postcode': 'postal_code',
                'result_city': 'city',
                'latitude': 'latitude',
                'longitude': 'longitude',
                'result_score': 'score',
                'result_id': 'ban_id'
            })
            valid_df['last_updated_at'] = pd.Timestamp.now()

            columns = [
                'ref_id', 'house_number', 'address', 'street', 'postal_code', 'city',
                'latitude', 'longitude', 'score', 'ban_id', 'address_kind', 'last_updated_at'
            ]
            valid_df = valid_df[columns]

            context.log.info(valid_df.head())

            if not valid_df.empty:
              context.log.warning("Inserting valid records into the database")
              buffer = StringIO()
              valid_df.to_csv(buffer, sep='\t', header=False, index=False)
              buffer.seek(0)
              cursor.copy_from(buffer, 'temp_ban_addresses', sep='\t')

              cursor.execute("SELECT COUNT(*) FROM temp_ban_addresses;")
              row_count = cursor.fetchone()[0]
              context.log.info(f"{row_count} rows inserted into temp_ban_addresses")

              cursor.execute("""
                  INSERT INTO ban_addresses (ref_id, house_number, address, street, postal_code, city, latitude, longitude, score, ban_id, address_kind, last_updated_at)
                  SELECT ref_id, house_number, address, street, postal_code, city, latitude, longitude, score, ban_id, address_kind, last_updated_at
                  FROM temp_ban_addresses
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
                      ban_id = EXCLUDED.ban_id,
                      last_updated_at = EXCLUDED.last_updated_at;
                """
              )

              cursor.execute("""
                  DELETE FROM temp_ban_addresses;
              """)
              total_inserted += len(valid_df)
          batch_number += 1
        conn.commit()
    except Exception as e:
      context.log.error(f"Error processing API response: {e}")
      raise

    context.log.info(f"Total records inserted: {total_inserted}")
    context.log.info(f"Total failed records: {total_failed}")

    return Output(
        value={"inserted_records": total_inserted, "failed_records": total_failed},
        metadata={"num_records": MetadataValue.text(f"{total_inserted} records inserted, {total_failed} failed")}
    )
