"""Daily TTL-based sync of ban_addresses for owners.

Replaces the legacy trio:
  - process_and_insert_owners
  - populate_missing_ban_addresses_for_owners
  - process_and_update_edited_owners

Idempotent: each upserted row refreshes last_updated_at and exits the predicate.
Not-found rows get a sentinel (ban_id=NULL, score=0) so they aren't retried
until the TTL elapses.
"""
import pandas as pd
from dagster import AssetExecutionContext, MetadataValue, Output, asset

from ._client import BanApiFatalError, call_ban_api
from ._queries import OWNERS_DAILY_SQL
from ._upsert import copy_upsert, create_temp_table, prepare_not_found, prepare_valid


@asset(
    name="sync_owners_ban_addresses",
    description=(
        "Daily TTL-based sync of ban_addresses for owners. "
        "Processes never-geocoded, edited, and stale (TTL-expired) owners only."
    ),
    required_resource_keys={"psycopg2_connection", "ban_config"},
)
def sync_owners_ban_addresses(context: AssetExecutionContext):
    config = context.resources.ban_config
    chunk = config.chunk_size
    cap = config.daily_max_records
    total_ok = total_nf = total_failed = total_processed = 0
    batch = 1

    with context.resources.psycopg2_connection as conn, conn.cursor() as cursor:
        create_temp_table(cursor)
        while total_processed < cap:
            limit = min(chunk, cap - total_processed)
            df = pd.read_sql_query(
                OWNERS_DAILY_SQL,
                conn,
                params={
                    "ttl_not_found": config.ttl_not_found_days,
                    "ttl_low_score": config.ttl_low_score_days,
                    "limit": limit,
                },
            )
            if df.empty:
                context.log.info("No more owner candidates — done.")
                break

            try:
                api = call_ban_api(df, config.api_url)
            except BanApiFatalError as e:
                context.log.error(f"batch {batch} fatal BAN error: {e}")
                raise
            except Exception as e:
                context.log.error(f"batch {batch} BAN failed after retries: {e}")
                total_failed += len(df)
                batch += 1
                continue

            valid = prepare_valid(api, "Owner")
            nf = prepare_not_found(api, "Owner")
            ok_count = copy_upsert(cursor, valid)
            nf_count = copy_upsert(cursor, nf)
            conn.commit()

            total_ok += ok_count
            total_nf += nf_count
            total_processed += len(df)
            context.log.info(
                f"batch {batch}: in={len(df)} ok={ok_count} not_found={nf_count} "
                f"processed_total={total_processed}/{cap}"
            )
            batch += 1

    summary = (
        f"{total_ok} ok, {total_nf} not_found, {total_failed} failed "
        f"(processed {total_processed}, cap {cap})"
    )
    context.log.info(summary)
    return Output(
        value={"ok": total_ok, "not_found": total_nf, "failed": total_failed},
        metadata={
            "summary": MetadataValue.text(summary),
            "ok": MetadataValue.int(total_ok),
            "not_found": MetadataValue.int(total_nf),
            "failed": MetadataValue.int(total_failed),
        },
    )
