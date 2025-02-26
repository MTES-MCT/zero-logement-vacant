from dagster import asset, MetadataValue, AssetExecutionContext, Output
import requests
import pandas as pd
from io import StringIO, BytesIO
from datetime import datetime
import time

@asset(
    description="Retrieve and process owners with edited BAN addresses, sending them directly to the API and updating valid responses into the database.",
    required_resource_keys={"psycopg2_connection", "ban_config"}
)
def process_and_update_edited_owners(context: AssetExecutionContext):
    config = context.resources.ban_config
    total_updated = 0
    total_failed = 0

    query = """
    SELECT o.id as owner_id, array_to_string(o.address_dgfip, ' ') as address_dgfip
    FROM owners o
    LEFT JOIN ban_addresses ba ON o.id = ba.ref_id
    WHERE (ba.address_kind = 'Owner' AND ba.ban_id IS NULL AND ba.score = 1);
    """

    try:
        with context.resources.psycopg2_connection as conn, conn.cursor() as cursor:
            df = pd.read_sql_query(query, conn)
            if df.empty:
                context.log.info("No owners to process.")
                return Output(value={"updated_records": 0, "failed_records": 0}, metadata={"num_records": MetadataValue.text("0 records updated, 0 failed")})

            csv_buffer = StringIO()
            df.to_csv(csv_buffer, index=False)
            csv_buffer.seek(0)

            files = {'data': ('owners.csv', csv_buffer, 'text/csv')}
            data = {'columns': 'address_dgfip', 'citycode': 'geo_code'}
            response = requests.post(config.api_url, files=files, data=data)

            if response.status_code != 200:
                context.log.warning(f"API request failed with status code {response.status_code}")
                return Output(value={"updated_records": 0, "failed_records": len(df)}, metadata={"num_records": MetadataValue.text(f"0 records updated, {len(df)} failed")})

            api_data = pd.read_csv(BytesIO(response.content))
            valid_df = api_data[api_data['result_status'] == 'ok'][['owner_id', 'result_id']].dropna()
            failed_count = len(api_data) - len(valid_df)
            total_failed += failed_count

            if failed_count > 0:
                context.log.warning(f"Number of owners with failed API results: {failed_count}")

            if not valid_df.empty:
                cursor.execute("""
                    CREATE TEMP TABLE temp_update_ban (
                        ref_id TEXT,
                        ban_id TEXT
                    ) ON COMMIT DROP;
                """)

                buffer = StringIO()
                valid_df.to_csv(buffer, sep='\t', header=False, index=False)
                buffer.seek(0)
                cursor.copy_from(buffer, 'temp_update_ban', sep='\t', columns=['ref_id', 'ban_id'])

                cursor.execute("""
                    UPDATE ban_addresses AS ba
                    SET ban_id = tba.ban_id
                    FROM pg_temp.temp_update_ban AS tba
                    WHERE ba.ref_id = tba.ref_id::uuid;
                """)
                conn.commit()
                total_updated += len(valid_df)

            context.log.info(f"Total records updated: {total_updated}")
            context.log.info(f"Total failed records: {total_failed}")

            return Output(
                value={"updated_records": total_updated, "failed_records": total_failed},
                metadata={"num_records": MetadataValue.text(f"{total_updated} records updated, {total_failed} failed")}
            )

    except Exception as e:
        context.log.error(f"Error processing API response and updating data: {e}")
        raise
