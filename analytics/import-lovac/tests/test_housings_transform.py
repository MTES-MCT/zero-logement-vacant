import uuid
from datetime import datetime, timezone

import polars as pl
import pytest

from src.housings.transform import transform_housings

LOVAC_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # uuidv5.DNS

ADMIN_USER_ID = "admin-user-id-000"
YEAR = "lovac-2024"


def _source_frame(**overrides) -> pl.LazyFrame:
    """Build a minimal source LazyFrame with one row."""
    row = {
        "invariant": "INV001",
        "local_id": "123456789012",
        "building_id": "BLD001",
        "dgfip_address": "1 rue de la Paix",
        "geo_code": "75101",
        "longitude_dgfip": 2.34,
        "latitude_dgfip": 48.86,
        "cadastral_classification": None,
        "uncomfortable": False,
        "vacancy_start_year": 2020,
        "housing_kind": "APPART",
        "rooms_count": 3,
        "living_area": 65,
        "building_year": 1990,
        "mutation_date": "2020-01-01",
        "building_location": None,
        "condominium": None,
        "plot_id": "PLOT001",
        "data_file_years": ["lovac-2024"],
        "geolocation": None,
        "geolocation_source": None,
        "plot_area": None,
        "last_mutation_date": None,
        "last_transaction_date": None,
        "last_transaction_value": None,
        "occupancy_history": None,
        "last_mutation_type": None,
        "dept": "75",
        **overrides,
    }
    return pl.LazyFrame([row])


def _empty_existing() -> pl.DataFrame:
    return pl.DataFrame(
        schema={
            "id": pl.Utf8,
            "local_id": pl.Utf8,
            "geo_code": pl.Utf8,
            "occupancy": pl.Utf8,
            "status": pl.Int64,
            "sub_status": pl.Utf8,
            "data_file_years": pl.List(pl.Utf8),
        }
    )


def _empty_events() -> pl.DataFrame:
    return pl.DataFrame(
        schema={
            "housing_id": pl.Utf8,
            "type": pl.Utf8,
            "created_by": pl.Utf8,
            "created_at": pl.Datetime,
        }
    )


def _existing_housing(
    housing_id="existing-uuid",
    local_id="123456789012",
    geo_code="75101",
    occupancy="V",
    status=0,
    sub_status=None,
    data_file_years=None,
) -> pl.DataFrame:
    return pl.DataFrame(
        [
            {
                "id": housing_id,
                "local_id": local_id,
                "geo_code": geo_code,
                "occupancy": occupancy,
                "status": status,
                "sub_status": sub_status,
                "data_file_years": data_file_years or ["lovac-2024"],
            }
        ]
    )


# ─── Create scenarios ─────────────────────────────────────────────────────────


class TestCreateHousings:
    def test_creates_housing_with_uuidv5_id(self):
        source = _source_frame()
        to_create, to_update, events, housing_events = transform_housings(
            source, _empty_existing(), _empty_events(), year=YEAR, admin_user_id=ADMIN_USER_ID
        )
        expected_id = str(uuid.uuid5(LOVAC_NAMESPACE, "123456789012:75101"))
        assert to_create.height == 1
        assert to_create["id"][0] == expected_id

    def test_sets_occupancy_and_source_to_vacant(self):
        to_create, _, _, _ = transform_housings(
            _source_frame(), _empty_existing(), _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert to_create["occupancy"][0] == "V"
        assert to_create["occupancy_source"][0] == "V"

    def test_sets_status_to_never_contacted(self):
        to_create, _, _, _ = transform_housings(
            _source_frame(), _empty_existing(), _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert to_create["status"][0] == 0
        assert to_create["sub_status"][0] is None

    def test_sets_data_file_years_to_year(self):
        to_create, _, _, _ = transform_housings(
            _source_frame(), _empty_existing(), _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert to_create["data_file_years"][0].to_list() == [YEAR]

    def test_wraps_dgfip_address_in_array(self):
        to_create, _, _, _ = transform_housings(
            _source_frame(dgfip_address="42 avenue des Champs"),
            _empty_existing(), _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert to_create["address_dgfip"][0].to_list() == ["42 avenue des Champs"]

    def test_generates_housing_created_event(self):
        to_create, _, events, housing_events = transform_housings(
            _source_frame(), _empty_existing(), _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        housing_id = to_create["id"][0]
        expected_event_id = str(
            uuid.uuid5(LOVAC_NAMESPACE, f"{housing_id}:housing:created:{YEAR}")
        )
        assert events.height == 1
        assert events["id"][0] == expected_event_id
        assert events["type"][0] == "housing:created"
        assert events["created_by"][0] == ADMIN_USER_ID
        assert events["next_old"][0] is None
        import json
        next_new = json.loads(events["next_new"][0])
        assert next_new == {"source": YEAR, "occupancy": "Vacant"}

        assert housing_events.height == 1
        assert housing_events["event_id"][0] == expected_event_id
        assert housing_events["housing_id"][0] == housing_id

    def test_no_updates_when_housing_is_new(self):
        _, to_update, _, _ = transform_housings(
            _source_frame(), _empty_existing(), _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert to_update.height == 0


# ─── Update scenarios ─────────────────────────────────────────────────────────


class TestUpdateHousings:
    def test_vacant_housing_preserves_occupancy_and_status(self):
        existing = _existing_housing(occupancy="V", status=0)
        _, to_update, events, _ = transform_housings(
            _source_frame(), existing, _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert to_update.height == 1
        assert to_update["occupancy"][0] == "V"
        assert to_update["status"][0] == 0
        # No events generated for already-vacant housing
        assert events.height == 0

    def test_appends_year_to_data_file_years_deduplicates_and_sorts(self):
        existing = _existing_housing(data_file_years=["lovac-2023"])
        _, to_update, _, _ = transform_housings(
            _source_frame(), existing, _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        years = to_update["data_file_years"][0].to_list()
        assert years == ["lovac-2023", "lovac-2024"]

    def test_deduplicates_data_file_years(self):
        existing = _existing_housing(data_file_years=["lovac-2024"])
        _, to_update, _, _ = transform_housings(
            _source_frame(), existing, _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        years = to_update["data_file_years"][0].to_list()
        assert years == ["lovac-2024"]

    def test_non_vacant_with_last_event_by_real_user_preserves(self):
        existing = _existing_housing(occupancy="RS", status=3, sub_status="En accompagnement")
        existing_events = pl.DataFrame(
            [
                {
                    "housing_id": "existing-uuid",
                    "type": "housing:occupancy-updated",
                    "created_by": "real-user-id",
                    "created_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
                }
            ]
        )
        _, to_update, events, _ = transform_housings(
            _source_frame(), existing, existing_events,
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert to_update["occupancy"][0] == "RS"
        assert to_update["status"][0] == 3
        assert to_update["sub_status"][0] == "En accompagnement"
        assert events.height == 0

    def test_non_vacant_with_last_event_by_admin_resets_to_vacant(self):
        existing = _existing_housing(occupancy="RS", status=3, sub_status="En accompagnement")
        existing_events = pl.DataFrame(
            [
                {
                    "housing_id": "existing-uuid",
                    "type": "housing:occupancy-updated",
                    "created_by": ADMIN_USER_ID,
                    "created_at": datetime(2024, 1, 1, tzinfo=timezone.utc),
                }
            ]
        )
        _, to_update, events, housing_events = transform_housings(
            _source_frame(), existing, existing_events,
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert to_update["occupancy"][0] == "V"
        assert to_update["status"][0] == 0
        assert to_update["sub_status"][0] is None
        # Should generate occupancy-updated and status-updated events
        event_types = events["type"].to_list()
        assert "housing:occupancy-updated" in event_types
        assert "housing:status-updated" in event_types

    def test_non_vacant_with_no_events_resets_to_vacant(self):
        existing = _existing_housing(occupancy="RS", status=3, sub_status="En accompagnement")
        _, to_update, events, housing_events = transform_housings(
            _source_frame(), existing, _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert to_update["occupancy"][0] == "V"
        assert to_update["status"][0] == 0
        assert to_update["sub_status"][0] is None
        event_types = events["type"].to_list()
        assert "housing:occupancy-updated" in event_types
        assert "housing:status-updated" in event_types

    def test_events_have_correct_housing_events_join(self):
        existing = _existing_housing(occupancy="RS", status=3)
        _, to_update, events, housing_events = transform_housings(
            _source_frame(), existing, _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert housing_events.height == events.height
        for i in range(events.height):
            assert housing_events["event_id"][i] == events["id"][i]
            assert housing_events["housing_id"][i] == "existing-uuid"

    def test_no_creates_when_housing_exists(self):
        existing = _existing_housing()
        to_create, _, _, _ = transform_housings(
            _source_frame(), existing, _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert to_create.height == 0

    def test_occupancy_event_has_structured_next_old_next_new(self):
        existing = _existing_housing(occupancy="RS", status=3, sub_status="En accompagnement")
        _, to_update, events, _ = transform_housings(
            _source_frame(), existing, _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        import json
        occ_events = events.filter(pl.col("type") == "housing:occupancy-updated")
        assert occ_events.height == 1
        next_old = json.loads(occ_events["next_old"][0])
        next_new = json.loads(occ_events["next_new"][0])
        assert next_old == {"occupancy": "Résidence secondaire non louée"}
        assert next_new == {"occupancy": "Vacant"}

        status_events = events.filter(pl.col("type") == "housing:status-updated")
        assert status_events.height == 1
        next_old = json.loads(status_events["next_old"][0])
        next_new = json.loads(status_events["next_new"][0])
        assert next_old == {"status": "Suivi en cours", "subStatus": "En accompagnement"}
        assert next_new == {"status": "Non suivi", "subStatus": None}

    def test_admin_event_after_user_event_resets(self):
        """When last event is by admin (even if earlier ones are by user), reset."""
        existing = _existing_housing(occupancy="RS", status=3)
        existing_events = pl.DataFrame(
            [
                {
                    "housing_id": "existing-uuid",
                    "type": "housing:occupancy-updated",
                    "created_by": "real-user-id",
                    "created_at": datetime(2023, 1, 1, tzinfo=timezone.utc),
                },
                {
                    "housing_id": "existing-uuid",
                    "type": "housing:status-updated",
                    "created_by": ADMIN_USER_ID,
                    "created_at": datetime(2024, 6, 1, tzinfo=timezone.utc),
                },
            ]
        )
        _, to_update, events, _ = transform_housings(
            _source_frame(), existing, existing_events,
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert to_update["occupancy"][0] == "V"
        assert to_update["status"][0] == 0
