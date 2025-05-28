from dagster import asset, MetadataValue, AssetExecutionContext, Output
import requests
import pandas as pd
from io import StringIO, BytesIO
from datetime import datetime
import time
import psycopg2


def process_not_valid_addresses(api_data: pd.DataFrame, cursor: psycopg2.extensions.cursor, context: AssetExecutionContext, conn: psycopg2.extensions.connection) -> pd.DataFrame:
    not_valid_df = api_data[api_data['result_status'] == 'not-found']
    ids = not_valid_df["owner_id"].unique()
    context.log.info(f"Dropping {len(ids)} addresses with result_status not ok")
    for id in ids:
        cursor.execute("""
            DELETE FROM ban_addresses WHERE ref_id = %s AND address_kind = 'Owner';
        """, (id,))

    conn.commit()
    return not_valid_df
@asset(
    description="Retrieve and process owners without a BAN address in chunks, sending them directly to the API and inserting valid responses into the database.",
    required_resource_keys={"psycopg2_connection", "ban_config"}
)
def process_and_insert_owners(context: AssetExecutionContext):
    config = context.resources.ban_config
    chunk_size = config.chunk_size
    total_inserted = 0
    total_failed = 0

    query_count = """
    SELECT COUNT(*) FROM owners o
    LEFT JOIN ban_addresses ba ON o.id = ba.ref_id
    WHERE (ba.address_kind = 'Owner' AND ba.ban_id IS NULL AND ba.score < 1);
    """

    try:
        with context.resources.psycopg2_connection as conn, conn.cursor() as cursor:
            cursor.execute(query_count)
            total_to_process = cursor.fetchone()[0]
            context.log.info(f"Total records to process: {total_to_process}")

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
                ) ON COMMIT PRESERVE ROWS;
            """)

            processed = 0
            while processed < total_to_process:
                query_data = f"""
                SELECT o.id as owner_id, array_to_string(o.address_dgfip, ' ') as address_dgfip
                FROM owners o
                LEFT JOIN ban_addresses ba ON o.id = ba.ref_id
                WHERE (ba.address_kind = 'Owner' AND ba.ban_id IS NULL)
                OFFSET {processed} LIMIT {chunk_size};
                """

                df = pd.read_sql_query(query_data, conn)
                if df.empty:
                    break

                if 'geo_code' in df.columns:
                    data = {'columns': 'address_dgfip', 'citycode': 'geo_code'}
                else:
                    data = {'columns': 'address_dgfip'}

                csv_buffer = StringIO()
                df.to_csv(csv_buffer, index=False)
                csv_buffer.seek(0)

                files = {'data': ('chunk.csv', csv_buffer, 'text/csv')}
                response = requests.post(config.api_url, files=files, data=data)
                time.sleep(1)

                if response.status_code != 200:
                    context.log.warning(f"API request failed with status code {response.status_code}")
                    continue

                api_data = pd.read_csv(BytesIO(response.content))
                _ = process_not_valid_addresses(api_data, cursor, context, conn)
                valid_df = api_data[api_data['result_status'] == 'ok'].copy()
                failed_count = len(api_data) - len(valid_df)
                total_failed += failed_count

                if failed_count > 0:
                    context.log.warning(f"Batch {processed // chunk_size + 1}: {failed_count} failed API results")

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

                expected_columns = [
                    'ref_id', 'house_number', 'address', 'street', 'postal_code', 'city',
                    'latitude', 'longitude', 'score', 'ban_id', 'address_kind', 'last_updated_at'
                ]
                valid_df = valid_df.reindex(columns=expected_columns, fill_value='NULL')

                if not valid_df.empty:
                    context.log.info(f"Valid DF size: {len(valid_df)}")
                    buffer = StringIO()
                    valid_df.to_csv(buffer, sep='\t', header=False, index=False, quoting=3)
                    buffer.seek(0)
                    cursor.copy_from(buffer, 'temp_ban_addresses', sep='\t', null='NULL', columns=expected_columns)

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
                    conn.commit()
                    cursor.execute("DELETE FROM temp_ban_addresses;")
                    total_inserted += len(valid_df)

                processed += chunk_size
                context.log.info(f"Processed {processed}/{total_to_process} records")

    except Exception as e:
        context.log.error(f"Error processing API response and inserting data: {e}")
        raise

    context.log.info(f"Total records inserted: {total_inserted}")
    context.log.info(f"Total failed records: {total_failed}")

    return Output(
        value={"inserted_records": total_inserted, "failed_records": total_failed},
        metadata={"num_records": MetadataValue.text(f"{total_inserted} records inserted, {total_failed} failed")}
    )
