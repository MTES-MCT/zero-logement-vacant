from dagster import asset, MetadataValue, AssetExecutionContext, Output
import requests
import pandas as pd
from io import StringIO, BytesIO
from datetime import datetime
import time

@asset(
  description="Retrieve owners with no BAN address or a non-validated BAN address (score < 1) and process them in chunks.",
  required_resource_keys={"psycopg2_connection", "ban_config"}
)
def process_owners_chunks(context: AssetExecutionContext):
    config = context.resources.ban_config
    chunk_size = config.chunk_size
    max_files = config.max_files
    disable_max_files = config.disable_max_files
    query = f"""
    SELECT
        o.id as owner_id,
        array_to_string(o.address_dgfip, ' ') as address_dgfip
    FROM owners o
    LEFT JOIN ban_addresses ba ON o.id = ba.ref_id
    WHERE (ba.ref_id IS NULL)  -- Propriétaires sans adresse
    {"LIMIT " + str(max_files * chunk_size) if not disable_max_files else ""}
    """
    context.log.info(f"Limit applied: {'LIMIT ' + str(max_files * chunk_size) if not disable_max_files else 'No limit'}")

    try:
      with context.resources.psycopg2_connection as conn:
        chunksize = config.chunk_size
        chunk_count = 0
        max_files = config.max_files
        disable_max_files = config.disable_max_files
        file_paths = []

        for chunk in pd.read_sql_query(query, conn, chunksize=chunksize):
          if not disable_max_files and chunk_count >= max_files:
            break

          chunk_file_path = f"owners_without_address_part_{chunk_count+1}.csv"
          chunk.to_csv(chunk_file_path, index=False)
          file_paths.append(chunk_file_path)

          context.log.info(f"CSV file created: {chunk_file_path}")
          chunk_count += 1

    except Exception as e:
      context.log.error(f"Error executing query: {e}")
      raise

    return Output(value=file_paths, metadata={"file_paths": MetadataValue.text(", ".join(file_paths))})

@asset(
    description="Process CSV chunks with the BAN address API and insert valid responses into the database.",
    required_resource_keys={"psycopg2_connection", "ban_config"}
)
def process_and_insert_owners(context: AssetExecutionContext, process_owners_chunks):
  config = context.resources.ban_config
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
      """)

      for file_path in process_owners_chunks:
        try:
          df = pd.read_csv(file_path)
          csv_buffer = StringIO()
          df.to_csv(csv_buffer, index=False)
          csv_buffer.seek(0)

          files = {'data': ('chunk.csv', csv_buffer, 'text/csv')}
          data = {'columns': 'address_dgfip', 'citycode': 'geo_code'}
          response = requests.post(config.api_url, files=files, data=data)
          time.sleep(1)

          if response.status_code != 200:
            context.log.warning(f"API request failed with status code {response.status_code}")
            continue

          api_data = pd.read_csv(BytesIO(response.content))
          valid_df = api_data[api_data['result_status'] == 'ok'].copy()
          failed_count = len(api_data) - len(valid_df)
          total_failed += failed_count

          if failed_count > 0:
            context.log.warning(f"Batch {batch_number}: {failed_count} housings with failed API results")
          else:
            context.log.info(f"Batch {batch_number}: All housings processed successfully")

          valid_df['address_kind'] = "Owner"
          valid_df = valid_df.rename(columns={
            'owner_id': 'ref_id',
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
          valid_df['last_updated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

          columns = [
            'ref_id', 'house_number', 'address', 'street', 'postal_code', 'city',
            'latitude', 'longitude', 'score', 'ban_id', 'address_kind', 'last_updated_at'
          ]
          valid_df = valid_df[columns]

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
            """)

            cursor.execute("""
                DELETE FROM temp_ban_addresses;
            """)
            total_inserted += len(valid_df)
        except Exception as e:
          context.log.error(f"Error processing file {file_path}: {e}")
        batch_number += 1
      conn.commit()
  except Exception as e:
    context.log.error(f"Error processing API response and inserting data: {e}")
    raise

  context.log.info(f"Total records inserted: {total_inserted}")
  context.log.info(f"Total failed records: {total_failed}")

  return Output(
      value={"inserted_records": total_inserted, "failed_records": total_failed},
      metadata={"num_records": MetadataValue.text(f"{total_inserted} records inserted, {total_failed} failed")}
  )
