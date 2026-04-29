import json
import uuid
from datetime import datetime, timezone

import polars as pl

from src.constants import LOVAC_NAMESPACE, OCCUPANCY_LABELS, HOUSING_STATUS_LABELS


def _housing_schema() -> dict:
    return {
        "id": pl.Utf8,
        "invariant": pl.Utf8,
        "local_id": pl.Utf8,
        "building_id": pl.Utf8,
        "building_group_id": pl.Utf8,
        "address_dgfip": pl.List(pl.Utf8),
        "geo_code": pl.Utf8,
        "longitude_dgfip": pl.Float64,
        "latitude_dgfip": pl.Float64,
        "cadastral_classification": pl.Int64,
        "cadastral_reference": pl.Utf8,
        "uncomfortable": pl.Boolean,
        "vacancy_start_year": pl.Int64,
        "housing_kind": pl.Utf8,
        "rooms_count": pl.Int64,
        "living_area": pl.Int64,
        "building_year": pl.Int64,
        "mutation_date": pl.Date,
        "taxed": pl.Boolean,
        "rental_value": pl.Float64,
        "beneficiary_count": pl.Int64,
        "building_location": pl.Utf8,
        "condominium": pl.Utf8,
        "plot_id": pl.Utf8,
        "occupancy": pl.Utf8,
        "occupancy_source": pl.Utf8,
        "occupancy_intended": pl.Utf8,
        "status": pl.Int64,
        "sub_status": pl.Utf8,
        "data_file_years": pl.List(pl.Utf8),
        "data_years": pl.List(pl.Int64),
        "data_source": pl.Utf8,
        "actual_dpe": pl.Utf8,
        "energy_consumption_bdnb": pl.Utf8,
        "energy_consumption_at_bdnb": pl.Utf8,
        "geolocation": pl.Utf8,
        "geolocation_source": pl.Utf8,
        "plot_area": pl.Float64,
        "last_mutation_date": pl.Date,
        "last_transaction_date": pl.Date,
        "last_transaction_value": pl.Float64,
        "occupancy_history": pl.Utf8,
        "last_mutation_type": pl.Utf8,
        "dept": pl.Utf8,
    }


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


def transform_housings(
    source: pl.LazyFrame,
    existing_housings: pl.DataFrame,
    existing_events: pl.DataFrame,
    *,
    year: str,
    admin_user_id: str,
) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    """Returns (to_create, to_update, events, housing_events)."""
    source_dataframe = source.collect()

    enriched = source_dataframe.join(
        existing_housings,
        on=["geo_code", "local_id"],
        how="left",
        suffix="_existing",
    )

    unmatched = enriched.filter(pl.col("id").is_null())
    matched = enriched.filter(pl.col("id").is_not_null())

    to_create, create_events, create_housing_events = _build_creates(
        unmatched, year, admin_user_id
    )
    to_update, update_events, update_housing_events = _build_updates(
        matched, existing_events, year, admin_user_id
    )

    events = pl.concat([create_events, update_events], how="vertical_relaxed")
    housing_events = pl.concat(
        [create_housing_events, update_housing_events], how="vertical_relaxed"
    )

    return to_create, to_update, events, housing_events


def _build_creates(
    unmatched: pl.DataFrame,
    year: str,
    admin_user_id: str,
) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    """Build create rows, housing:created events, and housing_events join records."""
    rows = []
    events = []
    housing_events = []
    now = datetime.now(timezone.utc)

    for row in unmatched.iter_rows(named=True):
        housing_id = str(
            uuid.uuid5(LOVAC_NAMESPACE, f"{row['local_id']}:{row['geo_code']}")
        )
        event_id = str(
            uuid.uuid5(LOVAC_NAMESPACE, f"{housing_id}:housing:created:{year}")
        )
        building_year = row.get("building_year")
        if building_year == 0:
            building_year = None
        living_area = row.get("living_area")
        if living_area is not None:
            living_area = int(living_area)

        rows.append(
            {
                "id": housing_id,
                "invariant": row["invariant"],
                "local_id": row["local_id"],
                "building_id": row.get("building_id"),
                "building_group_id": None,
                "address_dgfip": [row["dgfip_address"]],
                "geo_code": row["geo_code"],
                "longitude_dgfip": row.get("longitude_dgfip"),
                "latitude_dgfip": row.get("latitude_dgfip"),
                "cadastral_classification": row.get("cadastral_classification"),
                "cadastral_reference": None,
                "uncomfortable": row.get("uncomfortable"),
                "vacancy_start_year": row.get("vacancy_start_year"),
                "housing_kind": row.get("housing_kind"),
                "rooms_count": row.get("rooms_count"),
                "living_area": living_area,
                "building_year": building_year,
                "mutation_date": None,
                "taxed": row.get("taxed"),
                "rental_value": row.get("rental_value"),
                "beneficiary_count": None,
                "building_location": row.get("building_location"),
                "condominium": row.get("condominium"),
                "plot_id": row.get("plot_id"),
                "occupancy": "V",
                "occupancy_source": "V",
                "occupancy_intended": None,
                "status": 0,
                "sub_status": None,
                "data_file_years": [year],
                "data_years": [2024],
                "data_source": "lovac",
                "actual_dpe": None,
                "energy_consumption_bdnb": None,
                "energy_consumption_at_bdnb": None,
                "geolocation": None,
                "geolocation_source": row.get("geolocation_source"),
                "plot_area": row.get("plot_area"),
                "last_mutation_date": row.get("last_mutation_date"),
                "last_transaction_date": row.get("last_transaction_date"),
                "last_transaction_value": row.get("last_transaction_value"),
                "occupancy_history": row.get("occupancy_history"),
                "last_mutation_type": row.get("last_mutation_type"),
                "dept": row.get("dept"),
            }
        )

        events.append(
            {
                "id": event_id,
                "type": "housing:created",
                "next_old": None,
                "next_new": json.dumps({"source": year, "occupancy": "Vacant"}),
                "created_by": admin_user_id,
                "created_at": now,
            }
        )

        housing_events.append(
            {
                "event_id": event_id,
                "housing_geo_code": row["geo_code"],
                "housing_id": housing_id,
            }
        )

    events_df = pl.DataFrame(events, schema=_events_schema())
    housing_events_df = pl.DataFrame(housing_events, schema=_housing_events_schema())

    if not rows:
        creates_df = pl.DataFrame(schema=_housing_schema())
    else:
        creates_df = pl.DataFrame(rows)

    return creates_df, events_df, housing_events_df


def _build_updates(
    matched: pl.DataFrame,
    existing_events: pl.DataFrame,
    year: str,
    admin_user_id: str,
) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    """Build update rows and change events."""
    rows = []
    events = []
    housing_events = []
    now = datetime.now(timezone.utc)

    for row in matched.iter_rows(named=True):
        housing_id = row["id"]
        existing_occupancy = row["occupancy"]
        existing_status = row["status"]
        existing_sub_status = row["sub_status"]

        # Merge data_file_years: existing column gets _existing suffix
        # because source also has data_file_years
        existing_years = row.get("data_file_years_existing") or []
        merged_years = sorted(set(existing_years) | {year})

        # Determine occupancy/status changes
        housing_events_subset = existing_events.filter(
            pl.col("housing_id") == housing_id
        )
        patch = _apply_changes(
            housing_events_subset, existing_occupancy, admin_user_id
        )

        occupancy = patch.get("occupancy", existing_occupancy)
        status = patch.get("status", existing_status)
        sub_status = patch.get("sub_status", existing_sub_status)

        building_year = row.get("building_year")
        if building_year == 0:
            building_year = None
        living_area = row.get("living_area")
        if living_area is not None:
            living_area = int(living_area)

        rows.append(
            {
                "id": housing_id,
                "invariant": row["invariant"],
                "local_id": row["local_id"],
                "building_id": row.get("building_id"),
                "building_group_id": None,
                "address_dgfip": [row["dgfip_address"]],
                "geo_code": row["geo_code"],
                "longitude_dgfip": row.get("longitude_dgfip"),
                "latitude_dgfip": row.get("latitude_dgfip"),
                "cadastral_classification": row.get("cadastral_classification"),
                "cadastral_reference": None,
                "uncomfortable": row.get("uncomfortable"),
                "vacancy_start_year": row.get("vacancy_start_year"),
                "housing_kind": row.get("housing_kind"),
                "rooms_count": row.get("rooms_count"),
                "living_area": living_area,
                "building_year": building_year,
                "mutation_date": row.get("mutation_date"),
                "taxed": row.get("taxed"),
                "rental_value": row.get("rental_value"),
                "beneficiary_count": None,
                "building_location": row.get("building_location"),
                "condominium": row.get("condominium"),
                "plot_id": row.get("plot_id"),
                "occupancy": occupancy,
                "occupancy_source": "V",
                "occupancy_intended": None,
                "status": status,
                "sub_status": sub_status,
                "data_file_years": merged_years,
                "data_years": [2024],
                "data_source": "lovac",
                "actual_dpe": None,
                "energy_consumption_bdnb": None,
                "energy_consumption_at_bdnb": None,
                "geolocation": None,
                "geolocation_source": row.get("geolocation_source"),
                "plot_area": row.get("plot_area"),
                "last_mutation_date": row.get("last_mutation_date"),
                "last_transaction_date": row.get("last_transaction_date"),
                "last_transaction_value": row.get("last_transaction_value"),
                "occupancy_history": row.get("occupancy_history"),
                "last_mutation_type": row.get("last_mutation_type"),
                "dept": row.get("dept"),
            }
        )

        # Generate events only when values actually change
        if occupancy != existing_occupancy:
            event_id = str(
                uuid.uuid5(
                    LOVAC_NAMESPACE,
                    f"{housing_id}:housing:occupancy-updated:{year}",
                )
            )
            events.append(
                {
                    "id": event_id,
                    "type": "housing:occupancy-updated",
                    "next_old": json.dumps({"occupancy": OCCUPANCY_LABELS.get(str(existing_occupancy), str(existing_occupancy))}),
                    "next_new": json.dumps({"occupancy": OCCUPANCY_LABELS.get(str(occupancy), str(occupancy))}),
                    "created_by": admin_user_id,
                    "created_at": now,
                }
            )
            housing_events.append(
                {
                    "event_id": event_id,
                    "housing_geo_code": row["geo_code"],
                    "housing_id": housing_id,
                }
            )

        if status != existing_status:
            event_id = str(
                uuid.uuid5(
                    LOVAC_NAMESPACE,
                    f"{housing_id}:housing:status-updated:{year}",
                )
            )
            events.append(
                {
                    "id": event_id,
                    "type": "housing:status-updated",
                    "next_old": json.dumps({"status": HOUSING_STATUS_LABELS.get(existing_status, str(existing_status)), "subStatus": existing_sub_status}),
                    "next_new": json.dumps({"status": HOUSING_STATUS_LABELS.get(status, str(status)), "subStatus": sub_status}),
                    "created_by": admin_user_id,
                    "created_at": now,
                }
            )
            housing_events.append(
                {
                    "event_id": event_id,
                    "housing_geo_code": row["geo_code"],
                    "housing_id": housing_id,
                }
            )

    events_df = pl.DataFrame(events, schema=_events_schema())
    housing_events_df = pl.DataFrame(housing_events, schema=_housing_events_schema())

    if not rows:
        updates_df = pl.DataFrame(schema=_housing_schema())
    else:
        updates_df = pl.DataFrame(rows)

    return updates_df, events_df, housing_events_df


def _apply_changes(
    events: pl.DataFrame,
    existing_occupancy: str,
    admin_user_id: str,
) -> dict:
    """Decide whether to reset a housing to vacant based on event history.

    Returns a patch dict: empty means no change, otherwise contains
    occupancy/status/sub_status overrides.
    """
    # Already vacant — nothing to do
    if existing_occupancy == "V":
        return {}

    # Filter to relevant event types
    relevant = events.filter(
        pl.col("type").is_in(
            ["housing:occupancy-updated", "housing:status-updated"]
        )
    )

    # No relevant events — reset to vacant
    if relevant.height == 0:
        return {"occupancy": "V", "status": 0, "sub_status": None}

    # Sort by created_at descending, take the last event
    last_event = relevant.sort("created_at", descending=True).row(0, named=True)

    # If last event was by admin — reset to vacant
    if last_event["created_by"] == admin_user_id:
        return {"occupancy": "V", "status": 0, "sub_status": None}

    # Last event was by a real user — preserve current values
    return {}
