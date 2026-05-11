"""Unit tests for BAN upsert helpers — no DB required."""
import pandas as pd
import pytest

from src.assets.ban._upsert import EXPECTED_COLS, prepare_not_found, prepare_valid


def _api_row(owner_id, status, **overrides):
    base = {
        "ref_id": owner_id,
        "address_dgfip": "12 rue de Paris 75001 PARIS",
        "result_status": status,
        "result_housenumber": "12",
        "result_label": "12 Rue de Paris 75001 Paris",
        "result_street": "Rue de Paris",
        "result_postcode": "75001",
        "result_city": "Paris",
        "result_score": 0.97,
        "result_id": "ban_xyz",
        "latitude": 48.86,
        "longitude": 2.35,
    }
    base.update(overrides)
    return base


class TestPrepareValid:
    def test_empty_input_returns_empty(self):
        df = pd.DataFrame(columns=["result_status"])
        out = prepare_valid(df, "Owner")
        assert out.empty

    def test_only_ok_rows_kept(self):
        df = pd.DataFrame(
            [
                _api_row("a", "ok"),
                _api_row("b", "not-found"),
                _api_row("c", "ok"),
            ]
        )
        out = prepare_valid(df, "Owner")
        assert len(out) == 2
        assert set(out.columns) == set(EXPECTED_COLS)

    def test_columns_renamed_to_schema(self):
        df = pd.DataFrame([_api_row("a", "ok")])
        out = prepare_valid(df, "Housing")
        row = out.iloc[0]
        assert row["house_number"] == "12"
        assert row["address"] == "12 Rue de Paris 75001 Paris"
        assert row["street"] == "Rue de Paris"
        assert row["postal_code"] == "75001"
        assert row["city"] == "Paris"
        assert row["score"] == 0.97
        assert row["ban_id"] == "ban_xyz"
        assert row["address_kind"] == "Housing"
        assert row["last_updated_at"]

    @pytest.mark.parametrize("kind", ["Owner", "Housing"])
    def test_address_kind_propagated(self, kind):
        df = pd.DataFrame([_api_row("a", "ok")])
        out = prepare_valid(df, kind)
        assert (out["address_kind"] == kind).all()


class TestPrepareNotFound:
    def test_empty_input_returns_empty(self):
        df = pd.DataFrame(columns=["result_status"])
        out = prepare_not_found(df, "Owner")
        assert out.empty

    def test_only_non_ok_rows_kept(self):
        df = pd.DataFrame(
            [
                _api_row("a", "ok"),
                _api_row("b", "not-found"),
                _api_row("c", "not-found"),
            ]
        )
        out = prepare_not_found(df, "Owner")
        assert len(out) == 2

    def test_sentinel_fields(self):
        df = pd.DataFrame([_api_row("a", "not-found")])
        out = prepare_not_found(df, "Owner")
        row = out.iloc[0]
        # Sentinel: score=0, ban_id=NULL, address copied from dgfip
        assert row["score"] == 0.0
        assert row["ban_id"] == "NULL"
        assert row["address"] == "12 rue de Paris 75001 PARIS"
        assert row["address_kind"] == "Owner"
        assert row["last_updated_at"]

    def test_optional_fields_nulled(self):
        df = pd.DataFrame([_api_row("a", "not-found")])
        out = prepare_not_found(df, "Owner")
        row = out.iloc[0]
        for col in ("house_number", "street", "postal_code", "city", "latitude", "longitude"):
            assert row[col] == "NULL"

    def test_schema_columns(self):
        df = pd.DataFrame([_api_row("a", "not-found")])
        out = prepare_not_found(df, "Housing")
        assert set(out.columns) == set(EXPECTED_COLS)
