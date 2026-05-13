# Port source-housing-transform to Polars — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the stub `transform_housings` with a full port of the TypeScript business logic — column mapping, create/update split, occupancy/status rules, and event generation.

**Architecture:** Polars for bulk operations (join, filter, column select). Python row-level iteration for UUIDv5 generation and `applyChanges` logic. Events written to both `events` and `housing_events` tables.

**Tech Stack:** Python 3.11+, Polars, uuid (stdlib), pytest

**Spec:** `docs/superpowers/specs/2026-04-27-port-source-housing-transform-design.md`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `analytics/import-lovac/src/housings/transform.py` | Rewrite | Column mapping, create/update split, applyChanges, event generation |
| `analytics/import-lovac/src/housings/read.py` | Modify | Add `sub_status` to existing housing SELECT; add `read_admin_user_id` |
| `analytics/import-lovac/src/housings/write.py` | Modify | Update to handle two event tables (`events` + `housing_events`), explicit column lists for staging COPY |
| `analytics/import-lovac/src/config.py` | Modify | Add `system_account_email` field |
| `analytics/import-lovac/src/assets.py` | Modify | Pass `year` and `admin_user_id` to `transform_housings` |
| `analytics/import-lovac/tests/test_housings_transform.py` | Create | Unit tests for all transform scenarios |

---

### Task 1: Add `system_account_email` to config and `read_admin_user_id` to read module

**Files:**
- Modify: `analytics/import-lovac/src/config.py`
- Modify: `analytics/import-lovac/src/housings/read.py`

- [ ] **Step 1: Add `system_account_email` to `ImportLovacConfig`**

```python
# In analytics/import-lovac/src/config.py
class ImportLovacConfig(Config):
    """Run configuration for the LOVAC import pipeline."""

    year: str
    source_path: str
    departments: list[str] | None = None
    dry_run: bool = False
    connection_string: str = os.environ.get(
        "IMPORT_LOVAC_PG_URL",
        "postgresql://postgres:postgres@localhost/dev",
    )
    system_account_email: str = "admin@zerologementvacant.beta.gouv.fr"
```

- [ ] **Step 2: Add `read_admin_user_id` to `read.py`**

Append to `analytics/import-lovac/src/housings/read.py`:

```python
def read_admin_user_id(connection_string: str, email: str) -> str:
    """Look up the admin user id by email."""
    result = pl.read_database_uri(
        f"SELECT id FROM users WHERE email = '{email}' LIMIT 1",
        connection_string,
    )
    if result.height == 0:
        raise ValueError(f"No user found with email: {email}")
    return result["id"][0]
```

- [ ] **Step 3: Add `sub_status` to existing housing SELECT**

In `read_existing_housings`, change the SELECT to include `sub_status`:

```python
def read_existing_housings(connection_string: str, department: str) -> pl.DataFrame:
    """Read existing housings for a department from PostgreSQL."""
    return pl.read_database_uri(
        f"""
        SELECT id, local_id, geo_code, occupancy, status, sub_status, data_file_years
        FROM fast_housing
        WHERE geo_code LIKE '{department}%'
        """,
        connection_string,
    )
```

- [ ] **Step 4: Commit**

```bash
git add analytics/import-lovac/src/config.py analytics/import-lovac/src/housings/read.py
git commit -m "feat(server): add system_account_email config and read_admin_user_id"
```

---

### Task 2: Write failing tests for `_build_creates`

**Files:**
- Create: `analytics/import-lovac/tests/test_housings_transform.py`

- [ ] **Step 1: Write the test file with create scenarios**

```python
import uuid

import polars as pl
import pytest

from src.housings.transform import transform_housings

LOVAC_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # uuidv5.DNS


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


class TestBuildCreates:
    """New housings not present in the database."""

    def test_creates_housing_with_uuidv5_id(self):
        source = _source_frame(local_id="123456789012", geo_code="75101")
        to_create, to_update, _events, _housing_events = transform_housings(
            source, _empty_existing(), _empty_events(),
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        assert to_create.height == 1
        assert to_update.height == 0
        expected_id = str(uuid.uuid5(LOVAC_NAMESPACE, "123456789012:75101"))
        assert to_create["id"][0] == expected_id

    def test_creates_housing_with_vacant_occupancy(self):
        source = _source_frame()
        to_create, _, _, _ = transform_housings(
            source, _empty_existing(), _empty_events(),
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        assert to_create["occupancy"][0] == "V"
        assert to_create["occupancy_source"][0] == "V"

    def test_creates_housing_with_never_contacted_status(self):
        source = _source_frame()
        to_create, _, _, _ = transform_housings(
            source, _empty_existing(), _empty_events(),
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        assert to_create["status"][0] == 0
        assert to_create["sub_status"][0] is None

    def test_creates_housing_with_data_file_years(self):
        source = _source_frame()
        to_create, _, _, _ = transform_housings(
            source, _empty_existing(), _empty_events(),
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        assert to_create["data_file_years"][0].to_list() == ["lovac-2025"]

    def test_creates_housing_with_address_as_array(self):
        source = _source_frame(dgfip_address="1 rue de la Paix")
        to_create, _, _, _ = transform_housings(
            source, _empty_existing(), _empty_events(),
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        assert to_create["address_dgfip"][0].to_list() == ["1 rue de la Paix"]

    def test_creates_housing_event(self):
        source = _source_frame(local_id="123456789012", geo_code="75101")
        _, _, events, housing_events = transform_housings(
            source, _empty_existing(), _empty_events(),
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        assert events.height == 1
        assert events["type"][0] == "housing:created"
        assert events["created_by"][0] == "admin-uuid"
        housing_id = str(uuid.uuid5(LOVAC_NAMESPACE, "123456789012:75101"))
        expected_event_id = str(uuid.uuid5(LOVAC_NAMESPACE, f"{housing_id}:housing:created:lovac-2025"))
        assert events["id"][0] == expected_event_id
        assert housing_events.height == 1
        assert housing_events["housing_id"][0] == housing_id
        assert housing_events["event_id"][0] == expected_event_id
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/inad/dev/zero-logement-vacant.feat-import-lovac-owner-eetl/analytics/import-lovac && python -m pytest tests/test_housings_transform.py -v
```

Expected: FAIL (signature mismatch — `transform_housings` doesn't accept `year`/`admin_user_id` yet and returns 3-tuple not 4-tuple).

- [ ] **Step 3: Commit**

```bash
git add analytics/import-lovac/tests/test_housings_transform.py
git commit -m "test(server): add failing tests for housing transform creates"
```

---

### Task 3: Implement `_build_creates` and make create tests pass

**Files:**
- Rewrite: `analytics/import-lovac/src/housings/transform.py`

- [ ] **Step 1: Rewrite `transform.py` with create logic**

```python
import uuid
from datetime import datetime, timezone

import polars as pl


LOVAC_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # uuidv5.DNS

# Columns not written to fast_housing (read-only or partition key)
_DROP_COLUMNS = [
    "dept", "dgfip_address", "occupancy_history", "plot_area",
    "last_mutation_type",
]


def transform_housings(
    source: pl.LazyFrame,
    existing_housings: pl.DataFrame,
    existing_events: pl.DataFrame,
    *,
    year: str,
    admin_user_id: str,
) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    """Transform source housings into DB-ready create/update DataFrames.

    Returns (to_create, to_update, events, housing_events).
    """
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
        unmatched, year=year, admin_user_id=admin_user_id
    )
    to_update, update_events, update_housing_events = _build_updates(
        matched, existing_events, year=year, admin_user_id=admin_user_id
    )

    events = pl.concat([create_events, update_events], how="vertical_relaxed")
    housing_events = pl.concat(
        [create_housing_events, update_housing_events], how="vertical_relaxed"
    )

    return to_create, to_update, events, housing_events


def _build_creates(
    unmatched: pl.DataFrame,
    *,
    year: str,
    admin_user_id: str,
) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    """Build INSERT records and housing:created events for new housings."""
    rows = []
    event_rows = []
    housing_event_rows = []
    now = datetime.now(timezone.utc).isoformat()

    for row in unmatched.iter_rows(named=True):
        housing_id = str(uuid.uuid5(LOVAC_NAMESPACE, f"{row['local_id']}:{row['geo_code']}"))
        event_id = str(uuid.uuid5(LOVAC_NAMESPACE, f"{housing_id}:housing:created:{year}"))

        rows.append({
            "id": housing_id,
            "invariant": row["invariant"],
            "local_id": row["local_id"],
            "building_id": row["building_id"],
            "building_group_id": None,
            "address_dgfip": [row["dgfip_address"]],
            "geo_code": row["geo_code"],
            "longitude_dgfip": row["longitude_dgfip"],
            "latitude_dgfip": row["latitude_dgfip"],
            "cadastral_classification": row["cadastral_classification"],
            "uncomfortable": row.get("uncomfortable", False) or False,
            "vacancy_start_year": row["vacancy_start_year"],
            "housing_kind": row["housing_kind"],
            "rooms_count": row["rooms_count"],
            "living_area": int(row["living_area"]) if row["living_area"] is not None else None,
            "cadastral_reference": None,
            "building_year": row["building_year"] if row.get("building_year") not in (0, None) else None,
            "mutation_date": None,
            "taxed": row.get("taxed"),
            "data_years": [2024],
            "beneficiary_count": None,
            "building_location": row["building_location"],
            "rental_value": row.get("rental_value"),
            "condominium": row["condominium"],
            "status": 0,
            "sub_status": None,
            "actual_dpe": None,
            "energy_consumption_bdnb": None,
            "energy_consumption_at_bdnb": None,
            "occupancy_source": "V",
            "occupancy": "V",
            "occupancy_intended": None,
            "plot_id": row["plot_id"],
            "data_source": "lovac",
            "data_file_years": [year],
            "geolocation": None,
            "geolocation_source": row["geolocation_source"],
            "last_mutation_date": row["last_mutation_date"],
            "last_transaction_date": row["last_transaction_date"],
            "last_transaction_value": row["last_transaction_value"],
        })

        event_rows.append({
            "id": event_id,
            "type": "housing:created",
            "old": None,
            "new": None,
            "created_by": admin_user_id,
            "created_at": now,
        })
        housing_event_rows.append({
            "event_id": event_id,
            "housing_geo_code": row["geo_code"],
            "housing_id": housing_id,
        })

    to_create = pl.DataFrame(rows) if rows else pl.DataFrame(schema=_housing_schema())
    events = pl.DataFrame(event_rows) if event_rows else pl.DataFrame(schema=_events_schema())
    housing_events = pl.DataFrame(housing_event_rows) if housing_event_rows else pl.DataFrame(schema=_housing_events_schema())

    return to_create, events, housing_events


def _build_updates(
    matched: pl.DataFrame,
    existing_events: pl.DataFrame,
    *,
    year: str,
    admin_user_id: str,
) -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    """Build UPDATE records and occupancy/status events for existing housings."""
    rows = []
    event_rows = []
    housing_event_rows = []
    now = datetime.now(timezone.utc).isoformat()

    for row in matched.iter_rows(named=True):
        housing_id = row["id"]
        existing_occupancy = row["occupancy"]
        existing_status = row["status"]
        existing_sub_status = row["sub_status"]

        # Merge data_file_years
        existing_years = row.get("data_file_years_existing") or []
        merged_years = sorted(set(list(existing_years) + [year]))

        # Apply occupancy/status changes
        housing_events_for_id = existing_events.filter(
            pl.col("housing_id") == housing_id
        )
        patch = _apply_changes(
            housing_events_for_id,
            existing_occupancy,
            admin_user_id,
        )

        new_occupancy = patch.get("occupancy", existing_occupancy)
        new_status = patch.get("status", existing_status)
        new_sub_status = patch.get("sub_status", existing_sub_status)

        # Generate occupancy event if changed
        if new_occupancy != existing_occupancy:
            event_id = str(uuid.uuid5(LOVAC_NAMESPACE, f"{housing_id}:housing:occupancy-updated:{year}"))
            event_rows.append({
                "id": event_id,
                "type": "housing:occupancy-updated",
                "old": None,
                "new": None,
                "created_by": admin_user_id,
                "created_at": now,
            })
            housing_event_rows.append({
                "event_id": event_id,
                "housing_geo_code": row["geo_code"],
                "housing_id": housing_id,
            })

        # Generate status event if changed
        if new_status != existing_status:
            event_id = str(uuid.uuid5(LOVAC_NAMESPACE, f"{housing_id}:housing:status-updated:{year}"))
            event_rows.append({
                "id": event_id,
                "type": "housing:status-updated",
                "old": None,
                "new": None,
                "created_by": admin_user_id,
                "created_at": now,
            })
            housing_event_rows.append({
                "event_id": event_id,
                "housing_geo_code": row["geo_code"],
                "housing_id": housing_id,
            })

        rows.append({
            "id": housing_id,
            "invariant": row["invariant"],
            "local_id": row["local_id"],
            "building_id": row["building_id"],
            "building_group_id": None,
            "address_dgfip": [row["dgfip_address"]],
            "geo_code": row["geo_code"],
            "longitude_dgfip": row["longitude_dgfip"],
            "latitude_dgfip": row["latitude_dgfip"],
            "cadastral_classification": row["cadastral_classification"],
            "uncomfortable": row.get("uncomfortable", False) or False,
            "vacancy_start_year": row["vacancy_start_year"],
            "housing_kind": row["housing_kind"],
            "rooms_count": row["rooms_count"],
            "living_area": int(row["living_area"]) if row["living_area"] is not None else None,
            "cadastral_reference": None,
            "building_year": row["building_year"] if row.get("building_year") not in (0, None) else None,
            "mutation_date": None,
            "taxed": row.get("taxed"),
            "data_years": [2024],
            "beneficiary_count": None,
            "building_location": row["building_location"],
            "rental_value": row.get("rental_value"),
            "condominium": row["condominium"],
            "status": new_status,
            "sub_status": new_sub_status,
            "actual_dpe": None,
            "energy_consumption_bdnb": None,
            "energy_consumption_at_bdnb": None,
            "occupancy_source": new_occupancy,
            "occupancy": new_occupancy,
            "occupancy_intended": None,
            "plot_id": row["plot_id"],
            "data_source": "lovac",
            "data_file_years": merged_years,
            "geolocation": None,
            "geolocation_source": row["geolocation_source"],
            "last_mutation_date": row["last_mutation_date"],
            "last_transaction_date": row["last_transaction_date"],
            "last_transaction_value": row["last_transaction_value"],
        })

    to_update = pl.DataFrame(rows) if rows else pl.DataFrame(schema=_housing_schema())
    events = pl.DataFrame(event_rows) if event_rows else pl.DataFrame(schema=_events_schema())
    housing_events = pl.DataFrame(housing_event_rows) if housing_event_rows else pl.DataFrame(schema=_housing_events_schema())

    return to_update, events, housing_events


def _apply_changes(
    events: pl.DataFrame,
    existing_occupancy: str,
    admin_user_id: str,
) -> dict:
    """Decide occupancy/status changes based on existing state and event history.

    Rules:
    1. Already vacant → no change (LOVAC confirms it)
    2. Non-vacant, last status/occupancy event was by a real user → no change
    3. Non-vacant, last event by admin or no events → reset to vacant + never contacted
    """
    if existing_occupancy == "V":
        return {}

    relevant = events.filter(
        pl.col("type").is_in(["housing:occupancy-updated", "housing:status-updated"])
    )

    if relevant.height == 0:
        return {"occupancy": "V", "status": 0, "sub_status": None}

    last_event = relevant.sort("created_at").row(-1, named=True)

    if last_event["created_by"] == admin_user_id:
        return {"occupancy": "V", "status": 0, "sub_status": None}

    return {}


def _housing_schema() -> dict:
    """Empty schema for housing DataFrames."""
    return {
        "id": pl.Utf8, "invariant": pl.Utf8, "local_id": pl.Utf8,
        "building_id": pl.Utf8, "building_group_id": pl.Utf8,
        "address_dgfip": pl.List(pl.Utf8), "geo_code": pl.Utf8,
        "longitude_dgfip": pl.Float64, "latitude_dgfip": pl.Float64,
        "cadastral_classification": pl.Utf8, "uncomfortable": pl.Boolean,
        "vacancy_start_year": pl.Int64, "housing_kind": pl.Utf8,
        "rooms_count": pl.Int64, "living_area": pl.Int64,
        "cadastral_reference": pl.Utf8, "building_year": pl.Int64,
        "mutation_date": pl.Utf8, "taxed": pl.Boolean,
        "data_years": pl.List(pl.Int64), "beneficiary_count": pl.Int64,
        "building_location": pl.Utf8, "rental_value": pl.Int64,
        "condominium": pl.Utf8, "status": pl.Int64, "sub_status": pl.Utf8,
        "actual_dpe": pl.Utf8, "energy_consumption_bdnb": pl.Utf8,
        "energy_consumption_at_bdnb": pl.Utf8,
        "occupancy_source": pl.Utf8, "occupancy": pl.Utf8,
        "occupancy_intended": pl.Utf8, "plot_id": pl.Utf8,
        "data_source": pl.Utf8, "data_file_years": pl.List(pl.Utf8),
        "geolocation": pl.Utf8, "geolocation_source": pl.Utf8,
        "last_mutation_date": pl.Utf8, "last_transaction_date": pl.Utf8,
        "last_transaction_value": pl.Int64,
    }


def _events_schema() -> dict:
    """Empty schema for events DataFrame."""
    return {
        "id": pl.Utf8, "type": pl.Utf8, "old": pl.Utf8,
        "new": pl.Utf8, "created_by": pl.Utf8, "created_at": pl.Utf8,
    }


def _housing_events_schema() -> dict:
    """Empty schema for housing_events DataFrame."""
    return {
        "event_id": pl.Utf8, "housing_geo_code": pl.Utf8,
        "housing_id": pl.Utf8,
    }
```

- [ ] **Step 2: Run tests to verify creates pass**

```bash
cd /Users/inad/dev/zero-logement-vacant.feat-import-lovac-owner-eetl/analytics/import-lovac && python -m pytest tests/test_housings_transform.py::TestBuildCreates -v
```

Expected: all 6 create tests PASS.

- [ ] **Step 3: Commit**

```bash
git add analytics/import-lovac/src/housings/transform.py
git commit -m "feat(server): implement housing transform create logic with column mapping"
```

---

### Task 4: Write failing tests for update scenarios

**Files:**
- Modify: `analytics/import-lovac/tests/test_housings_transform.py`

- [ ] **Step 1: Add update test classes**

Append to `tests/test_housings_transform.py`:

```python
def _existing_housing(
    housing_id: str = "existing-uuid",
    local_id: str = "123456789012",
    geo_code: str = "75101",
    occupancy: str = "V",
    status: int = 0,
    sub_status: str | None = None,
    data_file_years: list[str] | None = None,
) -> pl.DataFrame:
    return pl.DataFrame([{
        "id": housing_id,
        "local_id": local_id,
        "geo_code": geo_code,
        "occupancy": occupancy,
        "status": status,
        "sub_status": sub_status,
        "data_file_years": data_file_years or ["lovac-2024"],
    }])


class TestUpdateVacantHousing:
    """Existing housing already marked as vacant — occupancy/status preserved."""

    def test_preserves_occupancy_and_status(self):
        existing = _existing_housing(occupancy="V", status=3)
        source = _source_frame(local_id="123456789012", geo_code="75101")
        _, to_update, events, _ = transform_housings(
            source, existing, _empty_events(),
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        assert to_update.height == 1
        assert to_update["occupancy"][0] == "V"
        assert to_update["status"][0] == 3
        assert events.height == 0

    def test_appends_year_to_data_file_years(self):
        existing = _existing_housing(data_file_years=["lovac-2024"])
        source = _source_frame(local_id="123456789012", geo_code="75101")
        _, to_update, _, _ = transform_housings(
            source, existing, _empty_events(),
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        assert to_update["data_file_years"][0].to_list() == ["lovac-2024", "lovac-2025"]

    def test_deduplicates_data_file_years(self):
        existing = _existing_housing(data_file_years=["lovac-2025"])
        source = _source_frame(local_id="123456789012", geo_code="75101")
        _, to_update, _, _ = transform_housings(
            source, existing, _empty_events(),
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        assert to_update["data_file_years"][0].to_list() == ["lovac-2025"]


class TestUpdateNonVacantUserModified:
    """Non-vacant housing whose last status/occupancy event was by a real user — preserved."""

    def test_preserves_occupancy_and_status(self):
        existing = _existing_housing(
            housing_id="h1", occupancy="L", status=3, sub_status="En accompagnement"
        )
        user_events = pl.DataFrame([{
            "housing_id": "h1",
            "type": "housing:occupancy-updated",
            "created_by": "real-user-uuid",
            "created_at": datetime(2024, 6, 1, tzinfo=timezone.utc),
        }])
        source = _source_frame(local_id="123456789012", geo_code="75101")
        _, to_update, events, _ = transform_housings(
            source, existing, user_events,
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        assert to_update["occupancy"][0] == "L"
        assert to_update["status"][0] == 3
        assert to_update["sub_status"][0] == "En accompagnement"
        assert events.height == 0


class TestUpdateNonVacantAdminModified:
    """Non-vacant housing whose last event was by admin — reset to vacant."""

    def test_resets_to_vacant_and_never_contacted(self):
        existing = _existing_housing(
            housing_id="h2", occupancy="L", status=3, sub_status="En accompagnement"
        )
        admin_events = pl.DataFrame([{
            "housing_id": "h2",
            "type": "housing:occupancy-updated",
            "created_by": "admin-uuid",
            "created_at": datetime(2024, 6, 1, tzinfo=timezone.utc),
        }])
        source = _source_frame(local_id="123456789012", geo_code="75101")
        _, to_update, events, housing_events = transform_housings(
            source, existing, admin_events,
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        assert to_update["occupancy"][0] == "V"
        assert to_update["status"][0] == 0
        assert to_update["sub_status"][0] is None
        # Should generate both occupancy and status events
        assert events.height == 2
        types = events["type"].to_list()
        assert "housing:occupancy-updated" in types
        assert "housing:status-updated" in types
        assert housing_events.height == 2

    def test_generates_events_with_correct_ids(self):
        existing = _existing_housing(
            housing_id="h3", occupancy="L", status=3
        )
        source = _source_frame(local_id="123456789012", geo_code="75101")
        _, _, events, housing_events = transform_housings(
            source, existing, _empty_events(),
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        occupancy_event = events.filter(pl.col("type") == "housing:occupancy-updated")
        expected_occ_id = str(uuid.uuid5(LOVAC_NAMESPACE, "h3:housing:occupancy-updated:lovac-2025"))
        assert occupancy_event["id"][0] == expected_occ_id
        status_event = events.filter(pl.col("type") == "housing:status-updated")
        expected_status_id = str(uuid.uuid5(LOVAC_NAMESPACE, "h3:housing:status-updated:lovac-2025"))
        assert status_event["id"][0] == expected_status_id


class TestUpdateNonVacantNoEvents:
    """Non-vacant housing with no events at all — reset to vacant."""

    def test_resets_to_vacant(self):
        existing = _existing_housing(
            housing_id="h4", occupancy="L", status=2
        )
        source = _source_frame(local_id="123456789012", geo_code="75101")
        _, to_update, events, _ = transform_housings(
            source, existing, _empty_events(),
            year="lovac-2025", admin_user_id="admin-uuid",
        )
        assert to_update["occupancy"][0] == "V"
        assert to_update["status"][0] == 0
        assert events.height == 2
```

Also add missing import at the top of the file:

```python
from datetime import datetime, timezone
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
cd /Users/inad/dev/zero-logement-vacant.feat-import-lovac-owner-eetl/analytics/import-lovac && python -m pytest tests/test_housings_transform.py -v
```

Expected: ALL tests PASS (the implementation from Task 3 already includes `_build_updates` and `_apply_changes`).

- [ ] **Step 3: Commit**

```bash
git add analytics/import-lovac/tests/test_housings_transform.py
git commit -m "test(server): add update scenario tests for housing transform"
```

---

### Task 5: Update write module for two event tables and explicit column lists

**Files:**
- Modify: `analytics/import-lovac/src/housings/write.py`

- [ ] **Step 1: Rewrite `write_housings` to accept 4 DataFrames and use explicit column lists**

Replace the entire content of `analytics/import-lovac/src/housings/write.py`:

```python
import polars as pl
import psycopg


BATCH_SIZE = 10_000

# Columns to INSERT into fast_housing (excludes read-only: plot_area, occupancy_history, last_mutation_type)
HOUSING_COLUMNS = [
    "id", "invariant", "local_id", "building_id", "building_group_id",
    "address_dgfip", "geo_code", "longitude_dgfip", "latitude_dgfip",
    "cadastral_classification", "uncomfortable", "vacancy_start_year",
    "housing_kind", "rooms_count", "living_area", "cadastral_reference",
    "building_year", "mutation_date", "taxed", "data_years",
    "beneficiary_count", "building_location", "rental_value", "condominium",
    "status", "sub_status", "actual_dpe", "energy_consumption_bdnb",
    "energy_consumption_at_bdnb", "occupancy_source", "occupancy",
    "occupancy_intended", "plot_id", "data_source", "data_file_years",
    "geolocation", "geolocation_source", "last_mutation_date",
    "last_transaction_date", "last_transaction_value",
]

# Columns to UPDATE on existing housings (subset of HOUSING_COLUMNS)
UPDATE_COLUMNS = [
    "invariant", "building_id", "building_group_id", "plot_id",
    "address_dgfip", "longitude_dgfip", "latitude_dgfip",
    "geolocation", "geolocation_source", "cadastral_classification",
    "uncomfortable", "vacancy_start_year", "housing_kind", "rooms_count",
    "living_area", "cadastral_reference", "building_year", "mutation_date",
    "last_mutation_date", "last_transaction_date", "last_transaction_value",
    "taxed", "data_years", "data_file_years", "data_source",
    "beneficiary_count", "building_location", "rental_value", "condominium",
    "status", "sub_status", "occupancy", "occupancy_source",
    "occupancy_intended", "energy_consumption_bdnb",
    "energy_consumption_at_bdnb",
]


def _copy_dataframe(cursor, dataframe: pl.DataFrame, table: str) -> None:
    """COPY a Polars DataFrame into a table via psycopg's COPY protocol."""
    columns = ", ".join(dataframe.columns)
    with cursor.copy(f"COPY {table} ({columns}) FROM STDIN") as copy:
        for row in dataframe.iter_rows():
            copy.write_row(row)


def write_housings(
    to_create: pl.DataFrame,
    to_update: pl.DataFrame,
    events: pl.DataFrame,
    housing_events: pl.DataFrame,
    connection_string: str,
    dry_run: bool = False,
) -> tuple[int, int, int]:
    """Write housings and events to PostgreSQL.

    Returns (created_count, updated_count, events_count).
    """
    if dry_run:
        to_create.write_ndjson("dry-run-housings-create.jsonl")
        to_update.write_ndjson("dry-run-housings-update.jsonl")
        events.write_ndjson("dry-run-housings-events.jsonl")
        return to_create.height, to_update.height, events.height

    created = 0
    updated = 0
    events_inserted = 0

    with psycopg.connect(connection_string) as connection:
        # Insert new housings
        if to_create.height > 0:
            create_subset = to_create.select(HOUSING_COLUMNS)
            with connection.cursor() as cursor:
                cursor.execute(
                    "CREATE TEMP TABLE stg_housings_create (LIKE fast_housing INCLUDING DEFAULTS) ON COMMIT DROP"
                )
                _copy_dataframe(cursor, create_subset, "stg_housings_create")
                columns = ", ".join(HOUSING_COLUMNS)
                cursor.execute(f"""
                    INSERT INTO fast_housing ({columns})
                    SELECT {columns} FROM stg_housings_create
                    ON CONFLICT (local_id, geo_code) DO NOTHING
                """)
                created = cursor.rowcount
            connection.commit()

        # Update existing housings in batches
        if to_update.height > 0:
            identifiers = to_update["id"].to_list()
            update_subset = to_update.select(["id", "geo_code"] + UPDATE_COLUMNS)
            with connection.cursor() as cursor:
                cursor.execute(
                    "CREATE TEMP TABLE stg_housings_update (LIKE fast_housing INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, update_subset, "stg_housings_update")
            set_clause = ", ".join(f"{col} = s.{col}" for col in UPDATE_COLUMNS)
            for offset in range(0, len(identifiers), BATCH_SIZE):
                batch = identifiers[offset : offset + BATCH_SIZE]
                with connection.cursor() as cursor:
                    cursor.execute(f"""
                        UPDATE fast_housing SET
                            {set_clause},
                            updated_at = now()
                        FROM stg_housings_update s
                        WHERE fast_housing.id = s.id
                          AND fast_housing.id = ANY(%s)
                    """, (batch,))
                    updated += cursor.rowcount
                connection.commit()

            with connection.cursor() as cursor:
                cursor.execute("DROP TABLE IF EXISTS stg_housings_update")
            connection.commit()

        # Insert events into both events + housing_events tables
        if events.height > 0:
            with connection.cursor() as cursor:
                cursor.execute(
                    "CREATE TEMP TABLE stg_events (LIKE events INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, events, "stg_events")
                cursor.execute("""
                    INSERT INTO events
                    SELECT * FROM stg_events
                    ON CONFLICT (id) DO NOTHING
                """)
                events_inserted = cursor.rowcount
                cursor.execute("DROP TABLE stg_events")

                cursor.execute(
                    "CREATE TEMP TABLE stg_housing_events (LIKE housing_events INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, housing_events, "stg_housing_events")
                cursor.execute("""
                    INSERT INTO housing_events
                    SELECT * FROM stg_housing_events
                    ON CONFLICT DO NOTHING
                """)
                cursor.execute("DROP TABLE stg_housing_events")
            connection.commit()

    return created, updated, events_inserted
```

- [ ] **Step 2: Commit**

```bash
git add analytics/import-lovac/src/housings/write.py
git commit -m "feat(server): update housing write to handle events and housing_events tables with explicit column lists"
```

---

### Task 6: Update asset to pass `year`, `admin_user_id`, and 4-tuple return

**Files:**
- Modify: `analytics/import-lovac/src/assets.py`

- [ ] **Step 1: Update `source_housings` asset**

In `analytics/import-lovac/src/assets.py`, update the `source_housings` asset function:

1. Add import for `read_admin_user_id`:

```python
from .housings.read import (
    read_source_housings,
    read_existing_housings,
    read_existing_housing_events,
    read_admin_user_id,
)
```

2. Update the asset body — add admin user lookup, pass `year`/`admin_user_id` to transform, pass 4 args to write:

```python
@asset(
    group_name="import_lovac",
    deps=["building_triggers_disabled"],
    partitions_def=departments_partitions,
)
def source_housings(
    context,
    config: ImportLovacConfig,
) -> MaterializeResult:
    """Import housings from LOVAC parquet. Partitioned by department."""
    department = context.partition_key

    context.log.info("Resolving admin user id...")
    admin_user_id = read_admin_user_id(
        config.connection_string, config.system_account_email
    )

    context.log.info(f"[{department}] Reading source housings...")
    source = read_source_housings(f"{config.source_path}/housings", department)

    context.log.info(f"[{department}] Reading existing housings from PostgreSQL...")
    existing = read_existing_housings(config.connection_string, department)
    context.log.info(f"[{department}] Loaded {existing.height} existing housings")

    housing_ids = existing["id"].to_list()
    context.log.info(f"[{department}] Reading {len(housing_ids)} housing events...")
    existing_events = read_existing_housing_events(
        config.connection_string, housing_ids
    )
    context.log.info(f"[{department}] Loaded {existing_events.height} events")

    context.log.info(f"[{department}] Transforming housings...")
    to_create, to_update, events, housing_events = transform_housings(
        source, existing, existing_events,
        year=config.year, admin_user_id=admin_user_id,
    )
    context.log.info(
        f"[{department}] To create: {to_create.height}, to update: {to_update.height}, events: {events.height}"
    )

    context.log.info(f"[{department}] Writing housings to PostgreSQL...")
    created, updated, events_count = write_housings(
        to_create, to_update, events, housing_events,
        config.connection_string, config.dry_run
    )
    context.log.info(f"[{department}] Done: {created} created, {updated} updated, {events_count} events")

    return MaterializeResult(
        metadata={
            "department": department,
            "dagster/row_count": to_create.height + to_update.height,
            "rows_created": MetadataValue.int(created),
            "rows_updated": MetadataValue.int(updated),
            "events_created": MetadataValue.int(events_count),
        }
    )
```

- [ ] **Step 2: Run all tests**

```bash
cd /Users/inad/dev/zero-logement-vacant.feat-import-lovac-owner-eetl/analytics/import-lovac && python -m pytest tests/ -v
```

Expected: ALL PASS.

- [ ] **Step 3: Commit**

```bash
git add analytics/import-lovac/src/assets.py
git commit -m "feat(server): wire admin_user_id and 4-tuple transform into source_housings asset"
```

---

### Task 7: Smoke test with Dagster

**Files:** None (manual verification)

- [ ] **Step 1: Start Dagster dev**

```bash
cd /Users/inad/dev/zero-logement-vacant.feat-import-lovac-owner-eetl/analytics/import-lovac && dagster dev
```

- [ ] **Step 2: Materialize a single partition**

In the Dagster UI, materialize `source_housings` for partition `01` (or whichever department has test data). Verify:
- No column errors
- Creates and updates logged correctly
- Events inserted into both `events` and `housing_events` tables

- [ ] **Step 3: Run all partitions**

Launch a backfill for all partitions via the `source_housings_job` launchpad.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(server): complete source-housing transform port to Polars"
```
