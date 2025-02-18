from dagster import asset, MetadataValue, AssetExecutionContext, Output
import requests
import pandas as pd
import pyarrow.parquet as pq
import pyarrow as pa
from io import StringIO, BytesIO
import os
from datetime import datetime
import time

CSV_FILE_NAME = "search_housings.csv"

@asset(
  description="Return housing records from `fast_housing` that have no matching entry in `ban_addresses`.",
  required_resource_keys={"psycopg2_connection"}
)
def housings_without_address(context: AssetExecutionContext):
  config = context.resources.ban_config
  output_file = "housings_without_address.parquet"
  query = """
  SELECT fh.id as housing_id, array_to_string(fh.address_dgfip, ' ') as address_dgfip, fh.geo_code
  FROM fast_housing fh
  LEFT JOIN ban_addresses ba ON fh.id = ba.ref_id
  WHERE ba.ban_id IS NULL;
  """

  try:
      with context.resources.psycopg2_connection as conn:
          parquet_writer = None
          chunksize = config.chunk_size

          for chunk in pd.read_sql_query(query, conn, chunksize=chunksize):
              table = pa.Table.from_pandas(chunk)

              if parquet_writer is None:
                  parquet_writer = pq.ParquetWriter(output_file, table.schema)

              parquet_writer.write_table(table)

          if parquet_writer is not None:
              parquet_writer.close()

  except Exception as e:
      context.log.error(f"Error executing query: {e}")
      raise

  context.log.info(f"Data saved to {output_file}")
  return Output(value=output_file, metadata={"file_path": MetadataValue.text(output_file)})

@asset(
    description="Split the housings Parquet file into multiple smaller Parquet files and store them to disk.",
    required_resource_keys={"ban_config"}
)
def split_parquet_housings_without_address(context: AssetExecutionContext, housings_without_address: str):
    config = context.resources.ban_config

    chunk_size = config.chunk_size
    max_files = config.max_files
    disable_max_files = config.disable_max_files

    file_paths = []
    chunk_count = 0

    if not os.path.exists(housings_without_address):
        context.log.error(f"File not found: {housings_without_address}")
        raise FileNotFoundError(f"File not found: {housings_without_address}")

    try:
        parquet_file = pq.ParquetFile(housings_without_address)

        for batch in parquet_file.iter_batches(batch_size=chunk_size):
            if not disable_max_files and chunk_count >= max_files:
                break

            chunk_table = pa.Table.from_batches([batch])
            chunk_file_path = f"housings_without_address_part_{chunk_count+1}.parquet"
            file_paths.append(chunk_file_path)

            pq.write_table(chunk_table, chunk_file_path, compression='snappy')

            context.log.info(f"Parquet file created: {chunk_file_path}")
            context.log.info(f"Generated {chunk_count + 1} Parquet files")

            chunk_count += 1

    except Exception as e:
        context.log.error(f"Error processing Parquet chunks: {e}")
        raise

    return Output(value=file_paths, metadata={"file_paths": MetadataValue.text(", ".join(file_paths))})

@asset(
    description="Send each Parquet chunk to the BAN address API, aggregate valid responses into a single Parquet file, and return the path to the aggregated file.",
    required_resource_keys={"ban_config"}
)
def process_parquet_housings_chunks_with_api(context: AssetExecutionContext, split_parquet_housings_without_address):
    config = context.resources.ban_config

    aggregated_file_path = "owners_without_address_aggregated.parquet"
    parquet_writer = None

    for file_path in split_parquet_housings_without_address:
        try:
            table = pq.read_table(file_path)
            df = table.to_pandas()

            csv_buffer = StringIO()
            df.to_csv(csv_buffer, index=False)
            csv_buffer.seek(0)

            files = {'data': ('chunk.csv', csv_buffer, 'text/csv')}
            data = {'columns': 'address_dgfip', 'citycode': 'geo_code'}
            response = requests.post(config.api_url, files=files, data=data)
            time.sleep(5)

            if response.status_code == 200:
                api_data = pd.read_csv(BytesIO(response.content))

                table = pa.Table.from_pandas(api_data)

                if parquet_writer is None:
                    parquet_writer = pq.ParquetWriter(aggregated_file_path, table.schema)

                parquet_writer.write_table(table)

                context.log.info(f"Processed file: {file_path}")

            else:
                context.log.warning(f"API request failed for {file_path} with status code {response.status_code}")

        except Exception as e:
            context.log.error(f"Error processing file {file_path}: {e}")

    if parquet_writer is not None:
        parquet_writer.close()

    return Output(value=aggregated_file_path, metadata={"file_path": MetadataValue.path(aggregated_file_path)})

@asset(
    description="Parse the aggregated Parquet file from the BAN address API, insert valid housings' addresses into `ban_addresses`, and return the count of processed records.",
    required_resource_keys={"psycopg2_connection"}
)
def parse_api_response_and_insert_housing_addresses(context: AssetExecutionContext, process_parquet_housings_chunks_with_api: str):
    if not os.path.exists(process_parquet_housings_chunks_with_api):
        context.log.error(f"File not found: {process_parquet_housings_chunks_with_api}")
        raise FileNotFoundError(f"File not found: {process_parquet_housings_chunks_with_api}")

    total_inserted = 0
    total_failed = 0

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

            parquet_file = pq.ParquetFile(process_parquet_housings_chunks_with_api)
            for batch in parquet_file.iter_batches(batch_size=1000):
                chunk_df = pa.Table.from_batches([batch]).to_pandas()

                valid_df = chunk_df[chunk_df['result_status'] == 'ok'].copy()
                failed_count = len(chunk_df) - len(valid_df)
                total_failed += failed_count

                if failed_count > 0:
                    context.log.warning(f"Batch: {failed_count} housings with failed API results")

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
                valid_df['last_updated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')

                columns = [
                    'ref_id', 'house_number', 'address', 'street', 'postal_code', 'city',
                    'latitude', 'longitude', 'score', 'ban_id', 'address_kind', 'last_updated_at'
                ]

                valid_df = valid_df[columns]

                if not valid_df.empty:
                    buffer = StringIO()
                    valid_df.to_csv(buffer, sep='\t', header=False, index=False)
                    buffer.seek(0)

                    cursor.copy_from(buffer, 'temp_ban_addresses', sep='\t')

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

                    total_inserted += len(valid_df)

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
