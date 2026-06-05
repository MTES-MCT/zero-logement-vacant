import json
import uuid

import polars as pl
import pytest

from src.existing_housings.transform import transform_existing_housings
from src.constants import LOVAC_NAMESPACE

YEAR = "lovac-2026"
ADMIN_USER_ID = "admin-user-id-000"


def _housings_missing(**overrides) -> pl.DataFrame:
    row = {
        "id": "housing-uuid-001",
        "local_id": "123456789012",
        "geo_code": "75101",
        "occupancy": "V",
        "status": 0,
        "sub_status": None,
        "data_file_years": ["lovac-2025"],
        **overrides,
    }
    return pl.DataFrame([row])


class TestExistingHousingsTransform:
    def test_sets_occupancy_to_inconnu(self):
        to_update, _, _ = transform_existing_housings(
            _housings_missing(), year=YEAR, admin_user_id=ADMIN_USER_ID
        )
        assert to_update["occupancy"][0] == "inconnu"

    def test_sets_status_to_completed(self):
        to_update, _, _ = transform_existing_housings(
            _housings_missing(), year=YEAR, admin_user_id=ADMIN_USER_ID
        )
        assert to_update["status"][0] == 4

    def test_sets_sub_status(self):
        to_update, _, _ = transform_existing_housings(
            _housings_missing(), year=YEAR, admin_user_id=ADMIN_USER_ID
        )
        assert to_update["sub_status"][0] == "Sortie de la vacance"

    def test_to_update_has_only_needed_columns(self):
        to_update, _, _ = transform_existing_housings(
            _housings_missing(), year=YEAR, admin_user_id=ADMIN_USER_ID
        )
        assert set(to_update.columns) == {"id", "occupancy", "status", "sub_status"}

    def test_generates_occupancy_updated_event(self):
        _, events, housing_events = transform_existing_housings(
            _housings_missing(), year=YEAR, admin_user_id=ADMIN_USER_ID
        )
        occ_events = events.filter(pl.col("type") == "housing:occupancy-updated")
        assert occ_events.height == 1
        expected_id = str(uuid.uuid5(
            LOVAC_NAMESPACE, "housing-uuid-001:housing:occupancy-updated:lovac-2026"
        ))
        assert occ_events["id"][0] == expected_id
        next_old = json.loads(occ_events["next_old"][0])
        next_new = json.loads(occ_events["next_new"][0])
        assert next_old == {"occupancy": "Vacant"}
        assert next_new == {"occupancy": "Pas d\u2019information"}

    def test_generates_status_updated_event(self):
        _, events, _ = transform_existing_housings(
            _housings_missing(status=1, sub_status="something"),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        status_events = events.filter(pl.col("type") == "housing:status-updated")
        assert status_events.height == 1
        expected_id = str(uuid.uuid5(
            LOVAC_NAMESPACE, "housing-uuid-001:housing:status-updated:lovac-2026"
        ))
        assert status_events["id"][0] == expected_id
        next_old = json.loads(status_events["next_old"][0])
        next_new = json.loads(status_events["next_new"][0])
        assert next_old == {"status": "En attente de retour", "subStatus": "something"}
        assert next_new == {"status": "Suivi terminé", "subStatus": "Sortie de la vacance"}

    def test_housing_events_join_rows(self):
        _, events, housing_events = transform_existing_housings(
            _housings_missing(), year=YEAR, admin_user_id=ADMIN_USER_ID
        )
        assert housing_events.height == events.height
        for i in range(events.height):
            assert housing_events["event_id"][i] == events["id"][i]
            assert housing_events["housing_id"][i] == "housing-uuid-001"
            assert housing_events["housing_geo_code"][i] == "75101"

    def test_events_created_by_admin(self):
        _, events, _ = transform_existing_housings(
            _housings_missing(), year=YEAR, admin_user_id=ADMIN_USER_ID
        )
        assert all(e == ADMIN_USER_ID for e in events["created_by"].to_list())

    def test_multiple_housings(self):
        housings = pl.DataFrame([
            {"id": "h1", "local_id": "L1", "geo_code": "75101", "occupancy": "V", "status": 0, "sub_status": None, "data_file_years": ["lovac-2025"]},
            {"id": "h2", "local_id": "L2", "geo_code": "75101", "occupancy": "V", "status": 1, "sub_status": None, "data_file_years": ["lovac-2025"]},
        ])
        to_update, events, housing_events = transform_existing_housings(
            housings, year=YEAR, admin_user_id=ADMIN_USER_ID
        )
        assert to_update.height == 2
        assert events.height == 4
        assert housing_events.height == 4
