from dagster import asset, MetadataValue, AssetExecutionContext, Output
import requests
import pandas as pd
from io import StringIO, BytesIO
from datetime import datetime
import time
import psycopg2


def process_not_valid_addresses(api_data: pd.DataFrame, cursor: psycopg2.extensions.cursor, context: AssetExecutionContext, conn: psycopg2.extensions.connection) -> pd.DataFrame:
    """Process addresses with not-found status - insert/update with NULL ban_id."""
    not_valid_df = api_data[api_data['result_status'] == 'not-found'].copy()
    
    if not_valid_df.empty:
        return not_valid_df
    
    context.log.info(f"Processing {len(not_valid_df)} addresses with result_status not-found")
    
    # Prepare data for insertion with NULL ban_id
    not_valid_df['ref_id'] = not_valid_df['owner_id']
    not_valid_df['ban_id'] = None
    not_valid_df['address_kind'] = 'Owner'
    not_valid_df['last_updated_at'] = datetime.now()
    not_valid_df['address'] = None
    
    # Set default values for missing fields
    not_valid_df['house_number'] = None
    not_valid_df['street'] = None
    not_valid_df['postal_code'] = None
    not_valid_df['city'] = None
    not_valid_df['latitude'] = None
    not_valid_df['longitude'] = None
    not_valid_df['score'] = 0.0
    
    # Insert/update records with NULL ban_id
    for _, row in not_valid_df.iterrows():
        cursor.execute("""
            INSERT INTO ban_addresses (
                ref_id, house_number, address, street, postal_code, city,
                latitude, longitude, score, ban_id, address_kind, last_updated_at
            ) VALUES (
                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
            )
            ON CONFLICT (ref_id, address_kind)
            DO UPDATE SET
                ban_id = NULL,
                score = 0.0,
                last_updated_at = EXCLUDED.last_updated_at,
                address = EXCLUDED.address;
        """, (
            row['ref_id'], row['house_number'], row['address'], row['street'],
            row['postal_code'], row['city'], row['latitude'], row['longitude'],
            row['score'], row['ban_id'], row['address_kind'], row['last_updated_at']
        ))
    
    conn.commit()
    return not_valid_df


def _create_temp_table(cursor):
    """Create temporary table for ban_addresses data."""
    cursor.execute("""
        CREATE TEMP TABLE temp_ban_addresses (
            ref_id UUID, house_number TEXT, address TEXT, street TEXT,
            postal_code TEXT, city TEXT, latitude FLOAT, longitude FLOAT,
            score FLOAT, ban_id TEXT, address_kind TEXT, last_updated_at TIMESTAMP
        ) ON COMMIT PRESERVE ROWS;
    """)


def _get_total_records_count(cursor):
    """Get count of records to process - all owners without a ban_addresses entry or with incomplete data."""
    cursor.execute("""
        SELECT COUNT(o.id)
        FROM owners o
        LEFT JOIN ban_addresses ba ON o.id = ba.ref_id AND ba.address_kind = 'Owner'
        WHERE ba.ref_id IS NULL 
           OR (ba.ban_id IS NULL AND ba.score < 1);
    """)
    return cursor.fetchone()[0]


def _fetch_batch_data(conn, chunk_size):
    """Fetch batch of owner data for processing - includes owners without any ban_addresses entry."""
    query = f"""
        SELECT o.id as owner_id, array_to_string(o.address_dgfip, ' ') as address_dgfip
        FROM owners o
        LEFT JOIN ban_addresses ba ON o.id = ba.ref_id AND ba.address_kind = 'Owner'
        WHERE ba.ref_id IS NULL 
           OR (ba.ban_id IS NULL AND ba.score < 1)
        LIMIT {chunk_size};
    """
    return pd.read_sql_query(query, conn)


def _call_ban_api(df, config):
    """Call BAN API with CSV data and return response."""
    data = {'columns': 'address_dgfip'}
    if 'geo_code' in df.columns:
        data['citycode'] = 'geo_code'
    
    csv_buffer = StringIO()
    df.to_csv(csv_buffer, index=False)
    csv_buffer.seek(0)
    
    files = {'data': ('chunk.csv', csv_buffer, 'text/csv')}
    response = requests.post(config.api_url, files=files, data=data)
    time.sleep(1)
    
    if response.status_code != 200:
        raise Exception(f"API request failed with status code {response.status_code}")
    
    return pd.read_csv(BytesIO(response.content))


def _prepare_valid_data(api_data):
    """Process API response and prepare valid data for insertion."""
    valid_df = api_data[api_data['result_status'] == 'ok'].copy()
    
    if valid_df.empty:
        return valid_df, len(api_data)
    
    # Rename and prepare columns
    column_mapping = {
        'owner_id': 'ref_id', 'result_housenumber': 'house_number',
        'result_label': 'address', 'result_street': 'street',
        'result_postcode': 'postal_code', 'result_city': 'city',
        'result_score': 'score', 'result_id': 'ban_id'
    }
    
    valid_df = valid_df.rename(columns=column_mapping)
    valid_df['address_kind'] = "Owner"
    valid_df['last_updated_at'] = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    
    # Ensure all expected columns exist
    expected_columns = [
        'ref_id', 'house_number', 'address', 'street', 'postal_code', 'city',
        'latitude', 'longitude', 'score', 'ban_id', 'address_kind', 'last_updated_at'
    ]
    valid_df = valid_df.reindex(columns=expected_columns, fill_value='NULL')
    
    return valid_df, len(api_data) - len(valid_df)


def _insert_batch_data(cursor, conn, valid_df):
    """Insert batch data into database using COPY."""
    if valid_df.empty:
        return 0
    
    expected_columns = [
        'ref_id', 'house_number', 'address', 'street', 'postal_code', 'city',
        'latitude', 'longitude', 'score', 'ban_id', 'address_kind', 'last_updated_at'
    ]
    
    # Use COPY for efficient bulk insert
    buffer = StringIO()
    valid_df.to_csv(buffer, sep='\t', header=False, index=False, quoting=3)
    buffer.seek(0)
    cursor.copy_from(buffer, 'temp_ban_addresses', sep='\t', null='NULL', columns=expected_columns)
    
    # Insert from temp table with conflict resolution
    cursor.execute("""
        INSERT INTO ban_addresses (ref_id, house_number, address, street, postal_code, city, 
                                 latitude, longitude, score, ban_id, address_kind, last_updated_at)
        SELECT * FROM temp_ban_addresses
        ON CONFLICT (ref_id, address_kind)
        DO UPDATE SET
            house_number = EXCLUDED.house_number, address = EXCLUDED.address,
            street = EXCLUDED.street, postal_code = EXCLUDED.postal_code,
            city = EXCLUDED.city, latitude = EXCLUDED.latitude,
            longitude = EXCLUDED.longitude, score = EXCLUDED.score,
            ban_id = EXCLUDED.ban_id, last_updated_at = EXCLUDED.last_updated_at;
    """)
    conn.commit()
    cursor.execute("DELETE FROM temp_ban_addresses;")
    
    return len(valid_df)


@asset(
    description="Process all owners to ensure each has a BAN address entry. Creates entries with NULL ban_id for not-found addresses.",
    required_resource_keys={"psycopg2_connection", "ban_config"}
)
def populate_missing_ban_addresses_for_owners(context: AssetExecutionContext):
    """Process owners and ensure all have ban_addresses entries."""
    config = context.resources.ban_config
    chunk_size = config.chunk_size
    total_inserted = total_failed = total_not_found = 0

    try:
        with context.resources.psycopg2_connection as conn, conn.cursor() as cursor:
            # Setup
            total_to_process = _get_total_records_count(cursor)
            context.log.info(f"Total records to process: {total_to_process}")
            _create_temp_table(cursor)

            # Process in batches until no more records
            batch_number = 1
            
            while True:
                try:
                    # Fetch and process batch
                    df = _fetch_batch_data(conn, chunk_size)
                    if df.empty:
                        context.log.info("No more records to process")
                        break

                    # Call API and process response
                    api_data = _call_ban_api(df, config)
                    
                    # Process not-found addresses (insert with NULL ban_id)
                    not_found_df = process_not_valid_addresses(api_data, cursor, context, conn)
                    total_not_found += len(not_found_df)
                    
                    # Prepare and insert valid data
                    valid_df, failed_count = _prepare_valid_data(api_data)
                    total_failed += failed_count
                    
                    if failed_count > 0:
                        context.log.warning(f"Batch {batch_number}: {failed_count} failed API results")
                    
                    if not valid_df.empty:
                        context.log.info(f"Valid DF size: {len(valid_df)}")
                        inserted_count = _insert_batch_data(cursor, conn, valid_df)
                        total_inserted += inserted_count

                    context.log.info(f"Completed batch {batch_number} - {len(df)} records processed")
                    batch_number += 1
                    
                except Exception as batch_error:
                    context.log.error(f"Error processing batch {batch_number}: {batch_error}")
                    batch_number += 1
                    continue

            # Final check - log any owners still without ban_addresses entries
            cursor.execute("""
                SELECT COUNT(*)
                FROM owners
                LEFT JOIN ban_addresses ON owners.id = ban_addresses.ref_id AND ban_addresses.address_kind = 'Owner'
                WHERE ban_addresses.ref_id IS NULL;
            """)
            remaining_count = cursor.fetchone()[0]
            
            if remaining_count > 0:
                context.log.warning(f"WARNING: {remaining_count} owners still without ban_addresses entries")
            else:
                context.log.info("SUCCESS: All owners now have ban_addresses entries")

    except Exception as e:
        context.log.error(f"Error in process_and_insert_owners: {e}")
        raise

    context.log.info(f"Total records with valid BAN data: {total_inserted}")
    context.log.info(f"Total records with NULL ban_id (not-found): {total_not_found}")
    context.log.info(f"Total failed records: {total_failed}")

    return Output(
        value={
            "inserted_records": total_inserted,
            "not_found_records": total_not_found,
            "failed_records": total_failed
        },
        metadata={
            "num_records": MetadataValue.text(
                f"{total_inserted} valid, {total_not_found} not-found (NULL ban_id), {total_failed} failed"
            )
        }
    )