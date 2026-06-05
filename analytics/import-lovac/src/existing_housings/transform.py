import json
import uuid
from datetime import datetime, timezone

import polars as pl

from src.constants import LOVAC_NAMESPACE, OCCUPANCY_LABELS, HOUSING_STATUS_LABELS


def _events_schema() -> dict:
    return {
        "id": pl.Utf8,
        "type": pl.Utf8,
        "next_old": pl.Utf8,
        "next_new": pl.Utf8,
        "created_by": pl.Utf8,
        "created_at": pl.Datetime,
    }


def _housing_events_schema() -> dict:
    return {
        "event_id": pl.Utf8,
        "housing_geo_code": pl.Utf8,
        "housing_id": pl.Utf8,
    }


def transform_existing_housings(
    housings_missing: pl.DataFrame,
    *,
    year: str,
    admin_user_id: str,
) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    """Compute status resets for housings missing from the current LOVAC year.

    Returns (to_update, events, housing_events).
    """
    events = []
    housing_events = []
    now = datetime.now(timezone.utc)

    for row in housings_missing.iter_rows(named=True):
        housing_id = row["id"]
        geo_code = row["geo_code"]
        existing_status = row["status"]
        existing_sub_status = row["sub_status"]

        # occupancy-updated event
        occ_event_id = str(uuid.uuid5(
            LOVAC_NAMESPACE, f"{housing_id}:housing:occupancy-updated:{year}"
        ))
        events.append({
            "id": occ_event_id,
            "type": "housing:occupancy-updated",
            "next_old": json.dumps({"occupancy": OCCUPANCY_LABELS.get("V", "V")}),
            "next_new": json.dumps({"occupancy": OCCUPANCY_LABELS.get("inconnu", "inconnu")}),
            "created_by": admin_user_id,
            "created_at": now,
        })
        housing_events.append({
            "event_id": occ_event_id,
            "housing_geo_code": geo_code,
            "housing_id": housing_id,
        })

        # status-updated event
        status_event_id = str(uuid.uuid5(
            LOVAC_NAMESPACE, f"{housing_id}:housing:status-updated:{year}"
        ))
        events.append({
            "id": status_event_id,
            "type": "housing:status-updated",
            "next_old": json.dumps({
                "status": HOUSING_STATUS_LABELS.get(existing_status, str(existing_status)),
                "subStatus": existing_sub_status,
            }),
            "next_new": json.dumps({
                "status": HOUSING_STATUS_LABELS[4],
                "subStatus": "Sortie de la vacance",
            }),
            "created_by": admin_user_id,
            "created_at": now,
        })
        housing_events.append({
            "event_id": status_event_id,
            "housing_geo_code": geo_code,
            "housing_id": housing_id,
        })

    to_update = housings_missing.select("id").with_columns(
        pl.lit("inconnu").alias("occupancy"),
        pl.lit(4).alias("status"),
        pl.lit("Sortie de la vacance").alias("sub_status"),
    )

    events_df = pl.DataFrame(events, schema=_events_schema())
    housing_events_df = pl.DataFrame(housing_events, schema=_housing_events_schema())

    return to_update, events_df, housing_events_df
