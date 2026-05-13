# Complete Dagster Pipeline Translation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Complete the Dagster import-lovac pipelines to full parity with the TypeScript import scripts.

**Architecture:** Four pipelines need work: source-owners (merge logic + timestamps), source-housings (event structure fix), existing-housings (full transform + events), source-housing-owners (full transform + events). All changes are test-first. A shared constants module avoids duplication.

**Tech Stack:** Python 3.11+, Polars, psycopg, pytest. Tests are pure unit tests with Polars DataFrames (no DB).

**Working directory:** `analytics/import-lovac/`

**Run tests with:** `cd analytics/import-lovac && uv run pytest tests/ -v`

---

### Task 1: Create shared constants module

**Files:**
- Create: `src/constants.py`
- Modify: `src/housings/transform.py` (remove duplicated `LOVAC_NAMESPACE`)

- [ ] **Step 1: Create `src/constants.py`**

```python
import uuid

LOVAC_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")
PREVIOUS_OWNER_RANK = -1

OCCUPANCY_LABELS = {
    "V": "Vacant",
    "L": "En location",
    "B": "Meublé de tourisme",
    "P": "Occupé par le propriétaire",
    "RS": "Résidence secondaire non louée",
    "T": "Local commercial ou bureau",
    "N": "Dépendance",
    "D": "Local démoli ou divisé",
    "G": "Occupé à titre gratuit",
    "F": "Fonctionnaire logé",
    "R": "Occupé par un artisan exonéré",
    "U": "Utilisation commune",
    "X": "Bail rural",
    "A": "Autres",
    "inconnu": "Pas d\u2019information",
}

HOUSING_STATUS_LABELS = {
    0: "Non suivi",
    1: "En attente de retour",
    2: "Premier contact",
    3: "Suivi en cours",
    4: "Suivi terminé",
    5: "Suivi bloqué",
}
```

- [ ] **Step 2: Update `src/housings/transform.py` to use shared constants**

Replace line 6:
```python
LOVAC_NAMESPACE = uuid.UUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")  # uuidv5.DNS
```
With:
```python
from src.constants import LOVAC_NAMESPACE
```

Also remove the `import uuid` line only if `uuid` is still used elsewhere in the file (it is — for `uuid.uuid5` calls). So keep `import uuid`, just remove the `LOVAC_NAMESPACE` assignment.

- [ ] **Step 3: Run existing tests to verify no regression**

```bash
cd analytics/import-lovac && uv run pytest tests/test_housings_transform.py -v
```

Expected: All existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add analytics/import-lovac/src/constants.py analytics/import-lovac/src/housings/transform.py
git commit -m "refactor: extract shared constants module for Dagster pipelines"
```

---

### Task 2: Fix source-housings event structure

**Files:**
- Modify: `src/housings/transform.py`
- Modify: `tests/test_housings_transform.py`

The events table uses columns `next_old`/`next_new` (JSONB), but the current code uses `old`/`new` with flat strings. Fix both the schema and the event payloads.

- [ ] **Step 1: Update tests to assert correct event column names and JSON structure**

In `tests/test_housings_transform.py`, update `test_generates_housing_created_event` (around line 144):

Replace:
```python
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

        assert housing_events.height == 1
        assert housing_events["event_id"][0] == expected_event_id
        assert housing_events["housing_id"][0] == housing_id
```

With:
```python
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
```

Add a new test for occupancy-updated event structure after `test_non_vacant_with_no_events_resets_to_vacant`:

```python
    def test_occupancy_event_has_structured_next_old_next_new(self):
        existing = _existing_housing(occupancy="RS", status=3, sub_status="En accompagnement")
        _, to_update, events, _ = transform_housings(
            _source_frame(), existing, _empty_events(),
            year=YEAR, admin_user_id=ADMIN_USER_ID,
        )
        import json
        occ_event = next(
            e for _, e in events.iter_rows(named=False)
            if False  # placeholder
        )
        # Filter for occupancy event
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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd analytics/import-lovac && uv run pytest tests/test_housings_transform.py -v
```

Expected: New assertions fail (column `next_old` doesn't exist, etc.)

- [ ] **Step 3: Update `_events_schema()` in `src/housings/transform.py`**

Replace:
```python
def _events_schema() -> dict:
    return {
        "id": pl.Utf8,
        "type": pl.Utf8,
        "old": pl.Utf8,
        "new": pl.Utf8,
        "created_by": pl.Utf8,
        "created_at": pl.Datetime,
    }
```

With:
```python
def _events_schema() -> dict:
    return {
        "id": pl.Utf8,
        "type": pl.Utf8,
        "next_old": pl.Utf8,
        "next_new": pl.Utf8,
        "created_by": pl.Utf8,
        "created_at": pl.Datetime,
    }
```

- [ ] **Step 4: Update `_build_creates` event payloads**

Add `import json` at the top of the file (alongside other imports). Then in `_build_creates`, replace the event dict (around line 187):

```python
        events.append(
            {
                "id": event_id,
                "type": "housing:created",
                "old": None,
                "new": None,
                "created_by": admin_user_id,
                "created_at": now,
            }
        )
```

With:
```python
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
```

- [ ] **Step 5: Update `_build_updates` event payloads**

Import the labels at the top:
```python
from src.constants import LOVAC_NAMESPACE, OCCUPANCY_LABELS, HOUSING_STATUS_LABELS
```

Replace the occupancy-updated event block (around line 316):
```python
            events.append(
                {
                    "id": event_id,
                    "type": "housing:occupancy-updated",
                    "old": str(existing_occupancy),
                    "new": str(occupancy),
                    "created_by": admin_user_id,
                    "created_at": now,
                }
            )
```

With:
```python
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
```

Replace the status-updated event block (around line 341):
```python
            events.append(
                {
                    "id": event_id,
                    "type": "housing:status-updated",
                    "old": str(existing_status),
                    "new": str(status),
                    "created_by": admin_user_id,
                    "created_at": now,
                }
            )
```

With:
```python
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
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
cd analytics/import-lovac && uv run pytest tests/test_housings_transform.py -v
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add analytics/import-lovac/src/housings/transform.py analytics/import-lovac/tests/test_housings_transform.py
git commit -m "fix: use next_old/next_new with structured JSON in housing events"
```

---

### Task 3: Source-owners transform tests and fix

**Files:**
- Create: `tests/test_owners_transform.py`
- Modify: `src/owners/read.py`
- Modify: `src/owners/transform.py`
- Modify: `src/owners/write.py`

- [ ] **Step 1: Write failing tests**

Create `tests/test_owners_transform.py`:

```python
import polars as pl
import pytest

from src.owners.transform import transform_owners, map_entity


YEAR = "lovac-2026"


def _source_frame(**overrides) -> pl.LazyFrame:
    row = {
        "owner_uid": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        "idpersonne": "ABC12345678",
        "full_name": "Jean Dupont",
        "username": None,
        "address_dgfip": "1 rue de la Paix",
        "ownership_type": "Particulier",
        "birth_date": "1980-01-01",
        "siren": None,
        "entity": None,
        **overrides,
    }
    return pl.LazyFrame([row])


def _empty_existing() -> pl.DataFrame:
    return pl.DataFrame(schema={
        "id": pl.Utf8,
        "idpersonne": pl.Utf8,
        "data_source": pl.Utf8,
        "email": pl.Utf8,
        "phone": pl.Utf8,
        "administrator": pl.Utf8,
        "additional_address": pl.Utf8,
    })


def _existing_owner(**overrides) -> pl.DataFrame:
    row = {
        "id": "existing-uuid",
        "idpersonne": "ABC12345678",
        "data_source": "lovac-2025",
        "email": "keep@example.com",
        "phone": "0600000000",
        "administrator": "admin-123",
        "additional_address": "Apt 4B",
        **overrides,
    }
    return pl.DataFrame([row])


class TestCreateOwners:
    def test_uses_owner_uid_as_id(self):
        to_create, to_update = transform_owners(
            _source_frame(), _empty_existing(), YEAR
        )
        assert to_create.height == 1
        assert to_update.height == 0
        assert to_create["id"][0] == "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"

    def test_sets_data_source_to_year(self):
        to_create, _ = transform_owners(
            _source_frame(), _empty_existing(), YEAR
        )
        assert to_create["data_source"][0] == YEAR

    def test_maps_null_entity_to_personnes_physiques(self):
        to_create, _ = transform_owners(
            _source_frame(entity=None), _empty_existing(), YEAR
        )
        assert to_create["entity"][0] == "personnes-physiques"

    def test_maps_entity_code_0(self):
        to_create, _ = transform_owners(
            _source_frame(entity="0"), _empty_existing(), YEAR
        )
        assert to_create["entity"][0] == "personnes-morales-non-remarquables"

    def test_maps_entity_code_4(self):
        to_create, _ = transform_owners(
            _source_frame(entity="4"), _empty_existing(), YEAR
        )
        assert to_create["entity"][0] == "commune"

    def test_maps_entity_code_0A(self):
        to_create, _ = transform_owners(
            _source_frame(entity="0A"), _empty_existing(), YEAR
        )
        assert to_create["entity"][0] == "personnes-morales-non-remarquables"


class TestUpdateOwners:
    def test_uses_owner_uid_as_id_not_existing(self):
        _, to_update = transform_owners(
            _source_frame(owner_uid="new-uuid-from-source"),
            _existing_owner(),
            YEAR,
        )
        assert to_update.height == 1
        assert to_update["id"][0] == "new-uuid-from-source"

    def test_preserves_existing_email(self):
        _, to_update = transform_owners(
            _source_frame(), _existing_owner(email="keep@test.fr"), YEAR
        )
        assert to_update["email_existing"][0] == "keep@test.fr"

    def test_preserves_existing_phone(self):
        _, to_update = transform_owners(
            _source_frame(), _existing_owner(phone="0612345678"), YEAR
        )
        assert to_update["phone_existing"][0] == "0612345678"
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd analytics/import-lovac && uv run pytest tests/test_owners_transform.py -v
```

Expected: Failures (missing columns, wrong id, etc.)

- [ ] **Step 3: Update `src/owners/read.py` — expand existing owners query**

Replace `read_existing_owners`:
```python
def read_existing_owners(connection_string: str) -> pl.DataFrame:
    """Read existing owners from PostgreSQL (only columns needed for join)."""
    return pl.read_database_uri(
        "SELECT id, idpersonne, data_source FROM owners",
        connection_string,
    )
```

With:
```python
def read_existing_owners(connection_string: str) -> pl.DataFrame:
    """Read existing owners from PostgreSQL (columns needed for join + preserved fields)."""
    return pl.read_database_uri(
        "SELECT id, idpersonne, data_source, email, phone, administrator, additional_address FROM owners",
        connection_string,
    )
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd analytics/import-lovac && uv run pytest tests/test_owners_transform.py -v
```

Expected: All pass.

- [ ] **Step 5: Update `src/owners/write.py` — timestamps and COALESCE**

Replace the CREATE INSERT SQL block:
```python
                cursor.execute("""
                    INSERT INTO owners (id, idpersonne, full_name, username, address_dgfip, birth_date, siren, kind_class, data_source)
                    SELECT id, idpersonne, full_name, username, address_dgfip, birth_date, siren, kind_class, data_source
                    FROM stg_owners_create
                    ON CONFLICT (id) DO NOTHING
                """)
```

With:
```python
                cursor.execute("""
                    INSERT INTO owners (id, idpersonne, full_name, username, address_dgfip, birth_date, siren, kind_class, data_source, created_at, updated_at)
                    SELECT id, idpersonne, full_name, username, address_dgfip, birth_date, siren, kind_class, data_source, now(), now()
                    FROM stg_owners_create
                    ON CONFLICT (id) DO NOTHING
                """)
```

Replace the UPDATE SQL block:
```python
                    cursor.execute("""
                        UPDATE owners SET
                            id = s.id,
                            full_name = s.full_name,
                            username = s.username,
                            birth_date = s.birth_date,
                            siren = s.siren,
                            address_dgfip = s.address_dgfip,
                            kind_class = s.kind_class,
                            data_source = s.data_source,
                            updated_at = now()
                        FROM stg_owners_update s
                        WHERE owners.idpersonne = s.idpersonne
                          AND owners.idpersonne = ANY(%s)
                    """, (batch,))
```

With:
```python
                    cursor.execute("""
                        UPDATE owners SET
                            id = s.id,
                            full_name = s.full_name,
                            username = COALESCE(s.username, owners.username),
                            birth_date = COALESCE(s.birth_date, owners.birth_date),
                            siren = COALESCE(s.siren, owners.siren),
                            address_dgfip = s.address_dgfip,
                            kind_class = s.kind_class,
                            data_source = COALESCE(s.data_source, owners.data_source),
                            updated_at = now()
                        FROM stg_owners_update s
                        WHERE owners.idpersonne = s.idpersonne
                          AND owners.idpersonne = ANY(%s)
                    """, (batch,))
```

- [ ] **Step 6: Run all tests**

```bash
cd analytics/import-lovac && uv run pytest tests/ -v
```

Expected: All pass.

- [ ] **Step 7: Commit**

```bash
git add analytics/import-lovac/src/owners/ analytics/import-lovac/tests/test_owners_transform.py
git commit -m "feat: complete source-owners transform with merge logic and timestamps"
```

---

### Task 4: Existing-housings transform

**Files:**
- Create: `tests/test_existing_housings_transform.py`
- Modify: `src/existing_housings/transform.py`
- Modify: `src/existing_housings/write.py`
- Modify: `src/assets.py` (existing_housings asset)

- [ ] **Step 1: Write failing tests**

Create `tests/test_existing_housings_transform.py`:

```python
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
        # 2 housings × 2 events each = 4 events
        assert events.height == 4
        assert housing_events.height == 4
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd analytics/import-lovac && uv run pytest tests/test_existing_housings_transform.py -v
```

Expected: TypeError (transform doesn't accept year/admin_user_id) or wrong return shape.

- [ ] **Step 3: Implement `src/existing_housings/transform.py`**

Replace the entire file:

```python
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd analytics/import-lovac && uv run pytest tests/test_existing_housings_transform.py -v
```

Expected: All pass.

- [ ] **Step 5: Update `src/existing_housings/write.py` to handle 3-tuple**

Replace `write_existing_housing_updates` signature and event handling. The current file writes to a `stg_eh_events` table with `LIKE housing_events` — but events go into TWO tables: `events` and `housing_events`. Replace the events section.

Replace the events block (lines 68-80):
```python
        if events.height > 0:
            with connection.cursor() as cursor:
                cursor.execute(
                    "CREATE TEMP TABLE stg_eh_events (LIKE housing_events INCLUDING DEFAULTS) ON COMMIT DROP"
                )
                _copy_dataframe(cursor, events, "stg_eh_events")
                cursor.execute("""
                    INSERT INTO housing_events
                    SELECT * FROM stg_eh_events
                    ON CONFLICT (id) DO NOTHING
                """)
                events_inserted = cursor.rowcount
            connection.commit()
```

With:
```python
        if events.height > 0:
            with connection.cursor() as cursor:
                cursor.execute(
                    "CREATE TEMP TABLE stg_eh_events (LIKE events INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, events, "stg_eh_events")
                cursor.execute("""
                    INSERT INTO events
                    SELECT * FROM stg_eh_events
                    ON CONFLICT (id) DO NOTHING
                """)
                events_inserted = cursor.rowcount
                cursor.execute("DROP TABLE stg_eh_events")

                cursor.execute(
                    "CREATE TEMP TABLE stg_eh_housing_events (LIKE housing_events INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, housing_events, "stg_eh_housing_events")
                cursor.execute("""
                    INSERT INTO housing_events
                    SELECT * FROM stg_eh_housing_events
                    ON CONFLICT DO NOTHING
                """)
                cursor.execute("DROP TABLE stg_eh_housing_events")
            connection.commit()
```

Also update the function signature to accept `housing_events`:
```python
def write_existing_housing_updates(
    to_update: pl.DataFrame,
    events: pl.DataFrame,
    housing_events: pl.DataFrame,
    connection_string: str,
    dry_run: bool = False,
) -> tuple[int, int]:
```

- [ ] **Step 6: Update `src/assets.py` — existing_housings asset**

Replace:
```python
    context.log.info(f"[{department}] Transforming existing housings...")
    to_update, events = transform_existing_housings(housings_missing)
    context.log.info(f"[{department}] To update: {to_update.height}, events: {events.height}")

    context.log.info(f"[{department}] Writing updates to PostgreSQL...")
    updated, events_count = write_existing_housing_updates(
        to_update, events, config.connection_string, config.dry_run
    )
```

With:
```python
    admin_user_id = read_admin_user_id(
        config.connection_string, config.system_account_email
    )

    context.log.info(f"[{department}] Transforming existing housings...")
    to_update, events, housing_events = transform_existing_housings(
        housings_missing, year=config.year, admin_user_id=admin_user_id
    )
    context.log.info(f"[{department}] To update: {to_update.height}, events: {events.height}")

    context.log.info(f"[{department}] Writing updates to PostgreSQL...")
    updated, events_count = write_existing_housing_updates(
        to_update, events, housing_events, config.connection_string, config.dry_run
    )
```

Add `read_admin_user_id` to the housings imports at the top of `assets.py` (it's already imported from `housings.read`).

- [ ] **Step 7: Run all tests**

```bash
cd analytics/import-lovac && uv run pytest tests/ -v
```

Expected: All pass.

- [ ] **Step 8: Commit**

```bash
git add analytics/import-lovac/src/existing_housings/ analytics/import-lovac/src/assets.py analytics/import-lovac/tests/test_existing_housings_transform.py
git commit -m "feat: implement existing-housings transform with status reset and events"
```

---

### Task 5: Source-housing-owners transform

**Files:**
- Create: `tests/test_housing_owners_transform.py`
- Modify: `src/housing_owners/read.py`
- Modify: `src/housing_owners/transform.py`
- Modify: `src/housing_owners/write.py`
- Modify: `src/assets.py` (source_housing_owners asset)

- [ ] **Step 1: Write failing tests**

Create `tests/test_housing_owners_transform.py`:

```python
import json
import uuid
from datetime import datetime, timezone

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
    """Owner in source, not in existing housing owners → attached."""

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
    """Existing active owner not in source → detached."""

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
    """Same owner but different rank → updated event."""

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
    """Existing inactive owner not in source → kept as-is."""

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
    """Missing housing or owner → row skipped."""

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
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd analytics/import-lovac && uv run pytest tests/test_housing_owners_transform.py -v
```

Expected: TypeError (transform signature wrong).

- [ ] **Step 3: Update `src/housing_owners/read.py` — add full_name to owner query**

Replace `read_existing_owners_for_join`:
```python
def read_existing_owners_for_join(connection_string: str) -> pl.DataFrame:
    """Read existing owner IDs for join.

    Note: owners are not partitioned by department — one owner can own
    properties across departments. We read all owners but only the id
    column needed for the join.
    """
    return pl.read_database_uri(
        "SELECT id FROM owners",
        connection_string,
    )
```

With:
```python
def read_existing_owners_for_join(connection_string: str) -> pl.DataFrame:
    """Read existing owner IDs and names for join and event generation.

    Note: owners are not partitioned by department — one owner can own
    properties across departments.
    """
    return pl.read_database_uri(
        "SELECT id, full_name FROM owners",
        connection_string,
    )
```

- [ ] **Step 4: Implement `src/housing_owners/transform.py`**

Replace the entire file:

```python
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

    all_ho_rows = []
    all_events = []
    all_ho_events = []

    # Process per housing
    housing_ids = with_owner["housing_id"].unique().to_list()
    for housing_id in housing_ids:
        housing_source = with_owner.filter(pl.col("housing_id") == housing_id)
        housing_geo_code = housing_source["geo_code"][0]

        # Build new active owners from source
        active_owners = {}
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
        existing_active = {}
        existing_inactive = {}
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
            oid for oid in common_ids
            if active_owners[oid]["rank"] != existing_active[oid]["rank"]
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd analytics/import-lovac && uv run pytest tests/test_housing_owners_transform.py -v
```

Expected: All pass.

- [ ] **Step 6: Update `src/housing_owners/write.py` — handle 3-tuple with events**

Replace the entire file:

```python
import polars as pl
import psycopg


def _copy_dataframe(cursor, dataframe: pl.DataFrame, table: str) -> None:
    """COPY a Polars DataFrame into a table via psycopg's COPY protocol."""
    columns = ", ".join(dataframe.columns)
    with cursor.copy(f"COPY {table} ({columns}) FROM STDIN") as copy:
        for row in dataframe.iter_rows():
            copy.write_row(row)


def write_housing_owners(
    housing_owner_rows: pl.DataFrame,
    events: pl.DataFrame,
    housing_owner_events: pl.DataFrame,
    connection_string: str,
    dry_run: bool = False,
) -> tuple[int, int]:
    """Write housing-owner links and events to PostgreSQL.

    Replaces the entire housing-owner set per housing (DELETE + INSERT).

    Returns (links_written, events_count).
    """
    if dry_run:
        housing_owner_rows.write_ndjson("dry-run-housing-owners.jsonl")
        events.write_ndjson("dry-run-housing-owner-events.jsonl")
        return housing_owner_rows.height, events.height

    links_written = 0
    events_inserted = 0

    with psycopg.connect(connection_string) as connection:
        if housing_owner_rows.height > 0:
            housing_ids = housing_owner_rows["housing_id"].unique().to_list()

            with connection.cursor() as cursor:
                cursor.execute(
                    "DELETE FROM owners_housing WHERE housing_id = ANY(%s)",
                    (housing_ids,),
                )
                cursor.execute(
                    "CREATE TEMP TABLE stg_housing_owners (LIKE owners_housing INCLUDING DEFAULTS) ON COMMIT DROP"
                )
                _copy_dataframe(cursor, housing_owner_rows, "stg_housing_owners")
                cursor.execute("""
                    INSERT INTO owners_housing
                    SELECT * FROM stg_housing_owners
                """)
                links_written = cursor.rowcount
            connection.commit()

        if events.height > 0:
            with connection.cursor() as cursor:
                cursor.execute(
                    "CREATE TEMP TABLE stg_ho_events (LIKE events INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, events, "stg_ho_events")
                cursor.execute("""
                    INSERT INTO events
                    SELECT * FROM stg_ho_events
                    ON CONFLICT (id) DO NOTHING
                """)
                events_inserted = cursor.rowcount
                cursor.execute("DROP TABLE stg_ho_events")

                cursor.execute(
                    "CREATE TEMP TABLE stg_ho_join_events (LIKE housing_owner_events INCLUDING DEFAULTS)"
                )
                _copy_dataframe(cursor, housing_owner_events, "stg_ho_join_events")
                cursor.execute("""
                    INSERT INTO housing_owner_events
                    SELECT * FROM stg_ho_join_events
                    ON CONFLICT DO NOTHING
                """)
                cursor.execute("DROP TABLE stg_ho_join_events")
            connection.commit()

    return links_written, events_inserted
```

- [ ] **Step 7: Update `src/assets.py` — source_housing_owners asset**

Replace the transform and write calls (lines 211-222):

```python
    context.log.info(f"[{department}] Transforming housing-owners...")
    housing_owner_rows, events = transform_housing_owners(
        source, existing_housings, existing_owners, existing_housing_owner_links
    )
    context.log.info(
        f"[{department}] Links: {housing_owner_rows.height}, events: {events.height}"
    )

    context.log.info(f"[{department}] Writing housing-owners to PostgreSQL...")
    links_written, events_count = write_housing_owners(
        housing_owner_rows, events, config.connection_string, config.dry_run
    )
```

With:

```python
    admin_user_id = read_admin_user_id(
        config.connection_string, config.system_account_email
    )

    context.log.info(f"[{department}] Transforming housing-owners...")
    housing_owner_rows, events, housing_owner_events = transform_housing_owners(
        source, existing_housings, existing_owners, existing_housing_owner_links,
        year=config.year, admin_user_id=admin_user_id,
    )
    context.log.info(
        f"[{department}] Links: {housing_owner_rows.height}, events: {events.height}"
    )

    context.log.info(f"[{department}] Writing housing-owners to PostgreSQL...")
    links_written, events_count = write_housing_owners(
        housing_owner_rows, events, housing_owner_events,
        config.connection_string, config.dry_run,
    )
```

- [ ] **Step 8: Run all tests**

```bash
cd analytics/import-lovac && uv run pytest tests/ -v
```

Expected: All pass.

- [ ] **Step 9: Commit**

```bash
git add analytics/import-lovac/src/housing_owners/ analytics/import-lovac/src/assets.py analytics/import-lovac/tests/test_housing_owners_transform.py
git commit -m "feat: implement source-housing-owners transform with replacement logic and events"
```

---

### Task 6: Final verification and commit of all new Dagster files

All untracked Dagster files need to be committed together.

- [ ] **Step 1: Run full test suite**

```bash
cd analytics/import-lovac && uv run pytest tests/ -v
```

Expected: All tests pass.

- [ ] **Step 2: Commit all remaining untracked Dagster files**

```bash
git add analytics/import-lovac/
git commit -m "feat: add complete Dagster import-lovac pipeline with all transforms and events"
```
