import json
import uuid

import polars as pl
import pytest

from src.housing_owners.transform import transform_housing_owners
from src.constants import LOVAC_NAMESPACE, PREVIOUS_OWNER_RANK

YEAR = "lovac-2026"
ADMIN_USER_ID = "admin-user-id-000"


def _source_frame(rows: list[dict]) -> pl.LazyFrame:
    return pl.LazyFrame(rows)


def _existing_housings(rows: list[dict]) -> pl.DataFrame:
    if not rows:
        return pl.DataFrame(schema={"id": pl.Utf8, "local_id": pl.Utf8, "geo_code": pl.Utf8})
    return pl.DataFrame(rows)


def _existing_owners(rows: list[dict]) -> pl.DataFrame:
    if not rows:
        return pl.DataFrame(schema={"id": pl.Utf8, "full_name": pl.Utf8})
    return pl.DataFrame(rows)


def _existing_housing_owners(rows: list[dict]) -> pl.DataFrame:
    if not rows:
        return pl.DataFrame(schema={
            "housing_id": pl.Utf8, "owner_id": pl.Utf8, "rank": pl.Int32,
            "start_date": pl.Date, "end_date": pl.Date,
        })
    return pl.DataFrame(rows)


class TestNewOwnerAttached:
    """Owner in source, not in existing housing owners -> attached."""

    def test_produces_active_owner_row(self):
        source = _source_frame([{
            "owner_uid": "owner-1", "geo_code": "75101", "local_id": "L00000000001",
            "idpersonne": "P1", "idprocpte": "PROC1", "idprodroit": "DROIT1",
            "locprop_source": 1, "property_right": "autre", "rank": 1,
        }])
        housings = _existing_housings([{"id": "h1", "local_id": "L00000000001", "geo_code": "75101"}])
        owners = _existing_owners([{"id": "owner-1", "full_name": "Jean Dupont"}])

        ho_rows, events, ho_events = transform_housing_owners(
            source, housings, owners, _existing_housing_owners([]),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert ho_rows.height == 1
        assert ho_rows["owner_id"][0] == "owner-1"
        assert ho_rows["housing_id"][0] == "h1"
        assert ho_rows["rank"][0] == 1

    def test_generates_owner_attached_event(self):
        source = _source_frame([{
            "owner_uid": "owner-1", "geo_code": "75101", "local_id": "L00000000001",
            "idpersonne": "P1", "idprocpte": "PROC1", "idprodroit": "DROIT1",
            "locprop_source": 1, "property_right": "autre", "rank": 1,
        }])
        housings = _existing_housings([{"id": "h1", "local_id": "L00000000001", "geo_code": "75101"}])
        owners = _existing_owners([{"id": "owner-1", "full_name": "Jean Dupont"}])

        _, events, ho_events = transform_housing_owners(
            source, housings, owners, _existing_housing_owners([]),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert events.height == 1
        assert events["type"][0] == "housing:owner-attached"
        next_new = json.loads(events["next_new"][0])
        assert next_new == {"name": "Jean Dupont", "rank": 1}
        assert events["next_old"][0] is None

        assert ho_events.height == 1
        assert ho_events["owner_id"][0] == "owner-1"
        assert ho_events["housing_id"][0] == "h1"


class TestExistingOwnerReplaced:
    """Existing active owner not in source -> detached."""

    def test_archives_removed_owner(self):
        source = _source_frame([{
            "owner_uid": "owner-new", "geo_code": "75101", "local_id": "L00000000001",
            "idpersonne": "P2", "idprocpte": "PROC2", "idprodroit": "DROIT2",
            "locprop_source": 1, "property_right": "autre", "rank": 1,
        }])
        housings = _existing_housings([{"id": "h1", "local_id": "L00000000001", "geo_code": "75101"}])
        owners = _existing_owners([
            {"id": "owner-old", "full_name": "Marie Martin"},
            {"id": "owner-new", "full_name": "Jean Dupont"},
        ])
        existing_ho = _existing_housing_owners([{
            "housing_id": "h1", "owner_id": "owner-old", "rank": 1,
            "start_date": None, "end_date": None,
        }])

        ho_rows, events, _ = transform_housing_owners(
            source, housings, owners, existing_ho,
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        archived = ho_rows.filter(pl.col("owner_id") == "owner-old")
        assert archived.height == 1
        assert archived["rank"][0] == PREVIOUS_OWNER_RANK
        assert archived["end_date"][0] is not None

    def test_generates_detached_and_attached_events(self):
        source = _source_frame([{
            "owner_uid": "owner-new", "geo_code": "75101", "local_id": "L00000000001",
            "idpersonne": "P2", "idprocpte": "PROC2", "idprodroit": "DROIT2",
            "locprop_source": 1, "property_right": "autre", "rank": 1,
        }])
        housings = _existing_housings([{"id": "h1", "local_id": "L00000000001", "geo_code": "75101"}])
        owners = _existing_owners([
            {"id": "owner-old", "full_name": "Marie Martin"},
            {"id": "owner-new", "full_name": "Jean Dupont"},
        ])
        existing_ho = _existing_housing_owners([{
            "housing_id": "h1", "owner_id": "owner-old", "rank": 1,
            "start_date": None, "end_date": None,
        }])

        _, events, _ = transform_housing_owners(
            source, housings, owners, existing_ho,
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        event_types = events["type"].to_list()
        assert "housing:owner-attached" in event_types
        assert "housing:owner-detached" in event_types

        detached = events.filter(pl.col("type") == "housing:owner-detached")
        next_old = json.loads(detached["next_old"][0])
        assert next_old == {"name": "Marie Martin", "rank": 1}
        assert detached["next_new"][0] is None


class TestRankChange:
    """Same owner but different rank -> updated event."""

    def test_generates_owner_updated_event(self):
        source = _source_frame([{
            "owner_uid": "owner-1", "geo_code": "75101", "local_id": "L00000000001",
            "idpersonne": "P1", "idprocpte": "PROC1", "idprodroit": "DROIT1",
            "locprop_source": 1, "property_right": "autre", "rank": 2,
        }])
        housings = _existing_housings([{"id": "h1", "local_id": "L00000000001", "geo_code": "75101"}])
        owners = _existing_owners([{"id": "owner-1", "full_name": "Jean Dupont"}])
        existing_ho = _existing_housing_owners([{
            "housing_id": "h1", "owner_id": "owner-1", "rank": 1,
            "start_date": None, "end_date": None,
        }])

        _, events, _ = transform_housing_owners(
            source, housings, owners, existing_ho,
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        updated = events.filter(pl.col("type") == "housing:owner-updated")
        assert updated.height == 1
        next_old = json.loads(updated["next_old"][0])
        next_new = json.loads(updated["next_new"][0])
        assert next_old == {"name": "Jean Dupont", "rank": 1}
        assert next_new == {"name": "Jean Dupont", "rank": 2}


class TestInactiveOwnerPreserved:
    """Existing inactive owner not in source -> kept as-is."""

    def test_preserves_inactive_owner(self):
        source = _source_frame([{
            "owner_uid": "owner-new", "geo_code": "75101", "local_id": "L00000000001",
            "idpersonne": "P2", "idprocpte": "PROC2", "idprodroit": "DROIT2",
            "locprop_source": 1, "property_right": "autre", "rank": 1,
        }])
        housings = _existing_housings([{"id": "h1", "local_id": "L00000000001", "geo_code": "75101"}])
        owners = _existing_owners([
            {"id": "owner-inactive", "full_name": "Vieux Proprio"},
            {"id": "owner-new", "full_name": "Jean Dupont"},
        ])
        existing_ho = _existing_housing_owners([{
            "housing_id": "h1", "owner_id": "owner-inactive", "rank": PREVIOUS_OWNER_RANK,
            "start_date": None, "end_date": None,
        }])

        ho_rows, _, _ = transform_housing_owners(
            source, housings, owners, existing_ho,
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        inactive = ho_rows.filter(pl.col("owner_id") == "owner-inactive")
        assert inactive.height == 1
        assert inactive["rank"][0] == PREVIOUS_OWNER_RANK


class TestMissingData:
    """Missing housing or owner -> row skipped."""

    def test_missing_housing_skips(self):
        source = _source_frame([{
            "owner_uid": "owner-1", "geo_code": "99999", "local_id": "MISSING000000",
            "idpersonne": "P1", "idprocpte": "PROC1", "idprodroit": "DROIT1",
            "locprop_source": 1, "property_right": "autre", "rank": 1,
        }])
        ho_rows, events, _ = transform_housing_owners(
            source, _existing_housings([]), _existing_owners([{"id": "owner-1", "full_name": "X"}]),
            _existing_housing_owners([]),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert ho_rows.height == 0
        assert events.height == 0

    def test_missing_owner_skips(self):
        source = _source_frame([{
            "owner_uid": "owner-missing", "geo_code": "75101", "local_id": "L00000000001",
            "idpersonne": "P1", "idprocpte": "PROC1", "idprodroit": "DROIT1",
            "locprop_source": 1, "property_right": "autre", "rank": 1,
        }])
        housings = _existing_housings([{"id": "h1", "local_id": "L00000000001", "geo_code": "75101"}])
        ho_rows, events, _ = transform_housing_owners(
            source, housings, _existing_owners([]),
            _existing_housing_owners([]),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        assert ho_rows.height == 0
        assert events.height == 0


class TestEventDeterminism:
    """Event UUIDs are deterministic via UUID5."""

    def test_event_id_is_uuid5(self):
        source = _source_frame([{
            "owner_uid": "owner-1", "geo_code": "75101", "local_id": "L00000000001",
            "idpersonne": "P1", "idprocpte": "PROC1", "idprodroit": "DROIT1",
            "locprop_source": 1, "property_right": "autre", "rank": 1,
        }])
        housings = _existing_housings([{"id": "h1", "local_id": "L00000000001", "geo_code": "75101"}])
        owners = _existing_owners([{"id": "owner-1", "full_name": "Jean Dupont"}])

        _, events, _ = transform_housing_owners(
            source, housings, owners, _existing_housing_owners([]),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        expected = str(uuid.uuid5(
            LOVAC_NAMESPACE, "h1:housing:owner-attached:owner-1:lovac-2026"
        ))
        assert events["id"][0] == expected
