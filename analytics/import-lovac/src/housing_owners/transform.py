import json
import uuid
from datetime import datetime, date, timezone

import polars as pl

from src.constants import LOVAC_NAMESPACE, PREVIOUS_OWNER_RANK

ACTIVE_OWNER_RANKS = [1, 2, 3, 4, 5, 6]


def _events_schema() -> dict:
    return {
        "id": pl.Utf8,
        "type": pl.Utf8,
        "next_old": pl.Utf8,
        "next_new": pl.Utf8,
        "created_by": pl.Utf8,
        "created_at": pl.Datetime,
    }


def _housing_owner_events_schema() -> dict:
    return {
        "event_id": pl.Utf8,
        "housing_geo_code": pl.Utf8,
        "housing_id": pl.Utf8,
        "owner_id": pl.Utf8,
    }


def _housing_owner_row_schema() -> dict:
    return {
        "owner_id": pl.Utf8,
        "housing_id": pl.Utf8,
        "housing_geo_code": pl.Utf8,
        "rank": pl.Int32,
        "start_date": pl.Date,
        "end_date": pl.Date,
        "origin": pl.Utf8,
        "idprocpte": pl.Utf8,
        "idprodroit": pl.Utf8,
        "locprop_source": pl.Utf8,
        "property_right": pl.Utf8,
        "locprop_relative_ban": pl.Utf8,
        "locprop_distance_ban": pl.Float64,
    }


def transform_housing_owners(
    source: pl.LazyFrame,
    existing_housings: pl.DataFrame,
    existing_owners: pl.DataFrame,
    existing_housing_owners: pl.DataFrame,
    *,
    year: str,
    admin_user_id: str,
) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    """Enrich source housing-owners and compute replacements + events.

    Returns (housing_owner_rows, events, housing_owner_events).
    """
    source_dataframe = source.collect()

    # Join source with existing housings to get housing IDs
    with_housing = source_dataframe.join(
        existing_housings,
        on=["geo_code", "local_id"],
        how="inner",
    ).rename({"id": "housing_id"})

    # Join with existing owners to confirm owner exists
    with_owner = with_housing.join(
        existing_owners,
        left_on="owner_uid",
        right_on="id",
        how="inner",
    ).rename({"owner_uid": "owner_id"})

    if with_owner.height == 0:
        return (
            pl.DataFrame(schema=_housing_owner_row_schema()),
            pl.DataFrame(schema=_events_schema()),
            pl.DataFrame(schema=_housing_owner_events_schema()),
        )

    # Build owner name lookup from existing_owners
    owner_names = dict(zip(
        existing_owners["id"].to_list(),
        existing_owners["full_name"].to_list(),
    ))

    now = datetime.now(timezone.utc)
    today = date.today()

    all_ho_rows: list[dict] = []
    all_events: list[dict] = []
    all_ho_events: list[dict] = []

    # Process per housing
    housing_ids = with_owner["housing_id"].unique().to_list()
    for housing_id in housing_ids:
        housing_source = with_owner.filter(pl.col("housing_id") == housing_id)
        housing_geo_code = housing_source["geo_code"][0]

        # Build new active owners from source
        active_owners: dict[str, dict] = {}
        for row in housing_source.iter_rows(named=True):
            owner_id = row["owner_id"]
            active_owners[owner_id] = {
                "owner_id": owner_id,
                "housing_id": housing_id,
                "housing_geo_code": housing_geo_code,
                "rank": row["rank"],
                "start_date": today,
                "end_date": None,
                "origin": None,
                "idprocpte": row.get("idprocpte"),
                "idprodroit": row.get("idprodroit"),
                "locprop_source": str(row.get("locprop_source")) if row.get("locprop_source") is not None else None,
                "property_right": row.get("property_right"),
                "locprop_relative_ban": None,
                "locprop_distance_ban": None,
            }

        # Get existing housing owners for this housing
        existing_for_housing = existing_housing_owners.filter(
            pl.col("housing_id") == housing_id
        )
        existing_active: dict[str, dict] = {}
        existing_inactive: dict[str, dict] = {}
        for row in existing_for_housing.iter_rows(named=True):
            owner_id = row["owner_id"]
            if row["rank"] in ACTIVE_OWNER_RANKS:
                existing_active[owner_id] = row
            else:
                existing_inactive[owner_id] = row

        # Compute diffs
        added_ids = set(active_owners.keys()) - set(existing_active.keys())
        removed_ids = set(existing_active.keys()) - set(active_owners.keys())
        common_ids = set(active_owners.keys()) & set(existing_active.keys())
        rank_changed_ids = {
            owner_id for owner_id in common_ids
            if active_owners[owner_id]["rank"] != existing_active[owner_id]["rank"]
        }

        # Add active owners
        for owner_id, ho_row in active_owners.items():
            all_ho_rows.append(ho_row)

        # Archive removed active owners
        for owner_id in removed_ids:
            existing_row = existing_active[owner_id]
            all_ho_rows.append({
                "owner_id": owner_id,
                "housing_id": housing_id,
                "housing_geo_code": housing_geo_code,
                "rank": PREVIOUS_OWNER_RANK,
                "start_date": existing_row.get("start_date"),
                "end_date": today,
                "origin": existing_row.get("origin"),
                "idprocpte": existing_row.get("idprocpte"),
                "idprodroit": existing_row.get("idprodroit"),
                "locprop_source": existing_row.get("locprop_source"),
                "property_right": existing_row.get("property_right"),
                "locprop_relative_ban": existing_row.get("locprop_relative_ban"),
                "locprop_distance_ban": existing_row.get("locprop_distance_ban"),
            })

        # Preserve inactive owners not in new active set
        for owner_id, existing_row in existing_inactive.items():
            if owner_id not in active_owners:
                all_ho_rows.append({
                    "owner_id": owner_id,
                    "housing_id": housing_id,
                    "housing_geo_code": housing_geo_code,
                    "rank": existing_row["rank"],
                    "start_date": existing_row.get("start_date"),
                    "end_date": existing_row.get("end_date"),
                    "origin": existing_row.get("origin"),
                    "idprocpte": existing_row.get("idprocpte"),
                    "idprodroit": existing_row.get("idprodroit"),
                    "locprop_source": existing_row.get("locprop_source"),
                    "property_right": existing_row.get("property_right"),
                    "locprop_relative_ban": existing_row.get("locprop_relative_ban"),
                    "locprop_distance_ban": existing_row.get("locprop_distance_ban"),
                })

        # Generate events
        for owner_id in added_ids:
            event_id = str(uuid.uuid5(
                LOVAC_NAMESPACE,
                f"{housing_id}:housing:owner-attached:{owner_id}:{year}",
            ))
            name = owner_names.get(owner_id, "")
            rank = active_owners[owner_id]["rank"]
            all_events.append({
                "id": event_id,
                "type": "housing:owner-attached",
                "next_old": None,
                "next_new": json.dumps({"name": name, "rank": rank}),
                "created_by": admin_user_id,
                "created_at": now,
            })
            all_ho_events.append({
                "event_id": event_id,
                "housing_geo_code": housing_geo_code,
                "housing_id": housing_id,
                "owner_id": owner_id,
            })

        for owner_id in removed_ids:
            event_id = str(uuid.uuid5(
                LOVAC_NAMESPACE,
                f"{housing_id}:housing:owner-detached:{owner_id}:{year}",
            ))
            name = owner_names.get(owner_id, "")
            rank = existing_active[owner_id]["rank"]
            all_events.append({
                "id": event_id,
                "type": "housing:owner-detached",
                "next_old": json.dumps({"name": name, "rank": rank}),
                "next_new": None,
                "created_by": admin_user_id,
                "created_at": now,
            })
            all_ho_events.append({
                "event_id": event_id,
                "housing_geo_code": housing_geo_code,
                "housing_id": housing_id,
                "owner_id": owner_id,
            })

        for owner_id in rank_changed_ids:
            event_id = str(uuid.uuid5(
                LOVAC_NAMESPACE,
                f"{housing_id}:housing:owner-updated:{owner_id}:{year}",
            ))
            name = owner_names.get(owner_id, "")
            old_rank = existing_active[owner_id]["rank"]
            new_rank = active_owners[owner_id]["rank"]
            all_events.append({
                "id": event_id,
                "type": "housing:owner-updated",
                "next_old": json.dumps({"name": name, "rank": old_rank}),
                "next_new": json.dumps({"name": name, "rank": new_rank}),
                "created_by": admin_user_id,
                "created_at": now,
            })
            all_ho_events.append({
                "event_id": event_id,
                "housing_geo_code": housing_geo_code,
                "housing_id": housing_id,
                "owner_id": owner_id,
            })

    ho_rows_df = pl.DataFrame(all_ho_rows, schema=_housing_owner_row_schema()) if all_ho_rows else pl.DataFrame(schema=_housing_owner_row_schema())
    events_df = pl.DataFrame(all_events, schema=_events_schema()) if all_events else pl.DataFrame(schema=_events_schema())
    ho_events_df = pl.DataFrame(all_ho_events, schema=_housing_owner_events_schema()) if all_ho_events else pl.DataFrame(schema=_housing_owner_events_schema())

    return ho_rows_df, events_df, ho_events_df
