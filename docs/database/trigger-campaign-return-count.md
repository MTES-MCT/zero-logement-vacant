# Database Triggers

## Campaign return count

**Introduced in:** migration `20260304_campaigns-add-return-count.ts`
**Updated in:** migration `20260407092027_campaigns-return-count-add-status-filter.ts`

### What is the return count?

`campaigns.return_count` is the number of **distinct housings** in a campaign that:
- have a current status in the range **FIRST_CONTACT..BLOCKED** (numeric values 2–5), and
- had at least one `housing:status-updated` or `housing:occupancy-updated` event created **after** the campaign's `sent_at` date.

It is displayed in the campaign view as "Nombre de retours". The return rate ("Taux de retour") is derived on the frontend: `returnCount / housingCount`.

`return_count` is `null`-equivalent (meaningless) when `campaigns.sent_at IS NULL` — the frontend treats it as "En attente de la date d'envoi" in that case.

### Why triggers instead of a query?

Reads (campaign view loads) are far more frequent than writes (new events, `sent_at` updates). Computing this on every read would require a full aggregation join across `housing_events` and `events`. Two triggers keep the column always up to date at write time.

### Three-trigger design for return_count

Three separate triggers maintain `return_count` because the events that invalidate it happen on different tables. PostgreSQL triggers are always bound to a single table.

| Trigger | Table | Timing | Strategy |
|---------|-------|--------|----------|
| `trg_increment_return_count` | `housing_events` | `AFTER INSERT` | **Incremental** — `+1` if this is the first qualifying event for a housing/campaign pair (housing status also checked) |
| `trg_recompute_return_count_on_sent_at_change` | `campaigns` | `AFTER UPDATE OF sent_at` | **Full recompute** — recounts from scratch because changing `sent_at` can qualify or disqualify any previously inserted events |
| `trg_recompute_return_count_on_housing_status_change` | `fast_housing` | `AFTER UPDATE OF status` | **Full recompute** — fires only when a housing's status crosses the 2..5 boundary, updating all campaigns containing that housing |

The incremental strategy is used for `housing_events` because it is the hot path (many events, frequent). Full recomputes are used for the other two because they are rare and the incremental approach cannot handle retroactive qualification changes.

### Deduplication invariant

A housing is counted **at most once** per campaign, regardless of how many qualifying events it accumulates. The `trg_increment_return_count` trigger enforces this by checking `already_counted` before incrementing.

### Indexes used (all pre-existing)

| Index | Migration | Used by |
|-------|-----------|---------|
| `campaigns_housing (housing_geo_code, housing_id)` | `20250611064718` | Both triggers |
| `housing_events (housing_geo_code, housing_id)` | `20250716150612` | Both triggers |
| `events (type, created_at DESC)` | `20250716132616` | Both triggers |

---

## `trg_increment_return_count`

**Table:** `housing_events` — **Timing:** `AFTER INSERT FOR EACH ROW`

Fires on every insert into `housing_events`. Increments `return_count` by 1 for each campaign where this housing/event pair qualifies as the **first** return.

**Early exit conditions (no DB writes):**
- The event type (fetched from `events`) is not `housing:status-updated` or `housing:occupancy-updated`
- The housing's current status is outside FIRST_CONTACT..BLOCKED (2..5)
- No campaign contains this housing with a matching `sent_at`

**Important:** `housing_events` is a junction table — it only stores `(event_id, housing_geo_code, housing_id)`. The event's `type` and `created_at` must be fetched from the `events` table via `NEW.event_id`.

```sql
CREATE OR REPLACE FUNCTION increment_campaign_return_count()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id       UUID;
  v_campaign_sent_at  TIMESTAMPTZ;
  already_counted     BOOLEAN;
  v_event_type        TEXT;
  v_event_created_at  TIMESTAMPTZ;
  v_housing_status    INT;
BEGIN
  -- housing_events only stores event_id; type and created_at live on events.
  SELECT e.type, e.created_at
  INTO v_event_type, v_event_created_at
  FROM events e
  WHERE e.id = NEW.event_id;

  -- Early exit: ignore events that cannot contribute to the return count.
  IF v_event_type NOT IN ('housing:status-updated', 'housing:occupancy-updated') THEN
    RETURN NEW;
  END IF;

  -- Only housings with status FIRST_CONTACT..BLOCKED (2..5) are counted.
  SELECT h.status INTO v_housing_status
  FROM fast_housing h
  WHERE h.id = NEW.housing_id
    AND h.geo_code = NEW.housing_geo_code;

  IF v_housing_status NOT BETWEEN 2 AND 5 THEN
    RETURN NEW;
  END IF;

  -- For each campaign that contains this housing and whose sent_at
  -- predates this event, check whether the count needs updating.
  FOR v_campaign_id, v_campaign_sent_at IN (
    SELECT c.id, c.sent_at
    FROM campaigns_housing ch
    JOIN campaigns c ON c.id = ch.campaign_id
    WHERE ch.housing_geo_code = NEW.housing_geo_code
      AND ch.housing_id       = NEW.housing_id
      AND c.sent_at IS NOT NULL
      AND v_event_created_at  > c.sent_at
  ) LOOP
    -- Acquire a row-level lock on the campaign to prevent concurrent
    -- increments from two events inserted in the same transaction.
    PERFORM id FROM campaigns WHERE id = v_campaign_id FOR UPDATE;

    -- A housing must be counted at most once per campaign.
    -- Check whether another qualifying event already exists for this
    -- housing/campaign pair (excluding the event we just inserted).
    SELECT EXISTS (
      SELECT 1
      FROM housing_events he
      JOIN events e ON e.id = he.event_id
      WHERE he.housing_geo_code = NEW.housing_geo_code
        AND he.housing_id       = NEW.housing_id
        AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
        AND e.created_at        > v_campaign_sent_at
        AND he.event_id        != NEW.event_id  -- exclude the row we just inserted
    ) INTO already_counted;

    IF NOT already_counted THEN
      UPDATE campaigns
      SET return_count = return_count + 1
      WHERE id = v_campaign_id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_increment_return_count
AFTER INSERT ON housing_events
FOR EACH ROW
EXECUTE FUNCTION increment_campaign_return_count();
```

---

## `trg_recompute_return_count_on_sent_at_change`

**Table:** `campaigns` — **Timing:** `AFTER UPDATE OF sent_at FOR EACH ROW`

Fires whenever `sent_at` is updated on a campaign. Performs a **full recompute** of `return_count` from scratch, because changing `sent_at` can retroactively qualify or disqualify events that were already inserted before this update — something the incremental trigger on `housing_events` cannot handle.

**Cases handled:**
- `sent_at` set for the first time: counts all existing qualifying events
- `sent_at` moved to an earlier date: more events may now qualify → count increases
- `sent_at` moved to a later date: fewer events may qualify → count decreases
- `sent_at` cleared (set to NULL): count reset to 0

**No-op condition:** if `sent_at` is not actually changed (e.g. `UPDATE campaigns SET title = ...`), the trigger exits immediately.

```sql
CREATE OR REPLACE FUNCTION recompute_campaign_return_count()
RETURNS TRIGGER AS $$
BEGIN
  -- No-op if sent_at did not change (UPDATE on other columns).
  IF NEW.sent_at IS NOT DISTINCT FROM OLD.sent_at THEN
    RETURN NEW;
  END IF;

  -- If sent_at is cleared, the return count is no longer meaningful.
  IF NEW.sent_at IS NULL THEN
    UPDATE campaigns SET return_count = 0 WHERE id = NEW.id;
    RETURN NEW;
  END IF;

  -- Full recompute: count distinct housings in this campaign that have
  -- a qualifying status and at least one qualifying event after sent_at.
  UPDATE campaigns
  SET return_count = (
    SELECT COUNT(DISTINCT ch.housing_id)
    FROM campaigns_housing ch
    JOIN fast_housing h ON h.id = ch.housing_id AND h.geo_code = ch.housing_geo_code
    WHERE ch.campaign_id = NEW.id
      AND h.status BETWEEN 2 AND 5
      AND EXISTS (
        SELECT 1
        FROM housing_events he
        JOIN events e ON e.id = he.event_id
        WHERE he.housing_geo_code = ch.housing_geo_code
          AND he.housing_id       = ch.housing_id
          AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
          AND e.created_at        > NEW.sent_at
      )
  )
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recompute_return_count_on_sent_at_change
AFTER UPDATE OF sent_at ON campaigns
FOR EACH ROW
EXECUTE FUNCTION recompute_campaign_return_count();
```

---

---

## `trg_recompute_return_count_on_housing_status_change`

**Table:** `fast_housing` — **Timing:** `AFTER UPDATE OF status FOR EACH ROW`

Fires whenever a housing's `status` column changes. Performs a **full recompute** for every campaign that contains this housing, but only when the status crosses the qualifying boundary (i.e., moves from inside 2..5 to outside, or vice versa). Changes within the same side of the boundary are no-ops.

**No-op conditions:**
- `status` did not change
- Both `OLD.status` and `NEW.status` are inside 2..5 (still qualifying — count unchanged)
- Both `OLD.status` and `NEW.status` are outside 2..5 (still non-qualifying — count unchanged)

```sql
CREATE OR REPLACE FUNCTION recompute_return_count_on_housing_status_change()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id UUID;
  v_sent_at     TIMESTAMPTZ;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF (OLD.status BETWEEN 2 AND 5) = (NEW.status BETWEEN 2 AND 5) THEN
    RETURN NEW;
  END IF;

  FOR v_campaign_id, v_sent_at IN (
    SELECT c.id, c.sent_at
    FROM campaigns_housing ch
    JOIN campaigns c ON c.id = ch.campaign_id
    WHERE ch.housing_id       = NEW.id
      AND ch.housing_geo_code = NEW.geo_code
      AND c.sent_at IS NOT NULL
  ) LOOP
    UPDATE campaigns
    SET return_count = (
      SELECT COUNT(DISTINCT ch2.housing_id)
      FROM campaigns_housing ch2
      JOIN fast_housing h ON h.id = ch2.housing_id AND h.geo_code = ch2.housing_geo_code
      WHERE ch2.campaign_id = v_campaign_id
        AND h.status BETWEEN 2 AND 5
        AND EXISTS (
          SELECT 1
          FROM housing_events he
          JOIN events e ON e.id = he.event_id
          WHERE he.housing_geo_code = ch2.housing_geo_code
            AND he.housing_id       = ch2.housing_id
            AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
            AND e.created_at        > v_sent_at
        )
    )
    WHERE id = v_campaign_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recompute_return_count_on_housing_status_change
AFTER UPDATE OF status ON fast_housing
FOR EACH ROW
EXECUTE FUNCTION recompute_return_count_on_housing_status_change();
```

---

## Known limitations

- `trg_increment_return_count` fires on INSERT only. If a `housing_events` row is deleted (which should not happen in normal operation due to cascade constraints), `return_count` is not decremented. A full recompute via `trg_recompute_return_count_on_sent_at_change` (by touching `sent_at`) would correct it.
- Neither the `housing_events` nor the `fast_housing` triggers fire on `UPDATE` of `events.type` or `events.created_at`. These columns are considered immutable after creation.

---

## Campaign housing count, owner count, and return rate

**Introduced in:** migration `20260319181202_campaigns-add-counts.ts`
**Updated in:** migration `20260319192744_campaigns-update-counts-on-housing-detach.ts`

### What are these columns?

| Column | Type | Description |
|--------|------|-------------|
| `housing_count` | `integer` | Number of housings attached to the campaign via `campaigns_housing` |
| `owner_count` | `integer` | Number of distinct primary owners (`rank = 1`) across those housings |
| `return_rate` | `float` (generated) | `return_count::float / NULLIF(housing_count, 0)` — computed automatically by PostgreSQL, never written directly |

`return_rate` is a `STORED GENERATED ALWAYS AS` column; it is recomputed by Postgres whenever `return_count` or `housing_count` changes.

### Two-trigger design

| Trigger | Table | Timing | Updates |
|---------|-------|--------|---------|
| `trg_update_campaign_counts` | `campaigns_housing` | `AFTER INSERT OR DELETE` | `housing_count`, `owner_count`, and (when `sent_at IS NOT NULL`) `return_count` |
| `trg_update_campaign_owner_count` | `owners_housing` | `AFTER INSERT OR DELETE OR UPDATE OF rank` | `owner_count` only |

Both triggers perform a **full recompute** (not incremental) because attach/detach operations are rare and correctness is simpler to guarantee with a fresh count.

### `trg_update_campaign_counts`

**Table:** `campaigns_housing` — **Timing:** `AFTER INSERT OR DELETE FOR EACH ROW`

Fires whenever a housing is attached to or detached from a campaign. Recomputes `housing_count` and `owner_count` from scratch. Also recomputes `return_count` when `sent_at IS NOT NULL`, so that detaching a housing that had qualifying events does not leave `return_count` stale.

**Key behavior:** `v_campaign_id` is resolved as `COALESCE(NEW.campaign_id, OLD.campaign_id)` to handle both INSERT and DELETE in a single function body.

```sql
CREATE OR REPLACE FUNCTION update_campaign_counts()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id UUID;
  v_sent_at     TIMESTAMPTZ;
BEGIN
  v_campaign_id := COALESCE(NEW.campaign_id, OLD.campaign_id);

  SELECT sent_at INTO v_sent_at FROM campaigns WHERE id = v_campaign_id;

  UPDATE campaigns
  SET
    housing_count = (
      SELECT COUNT(*)
      FROM campaigns_housing
      WHERE campaign_id = v_campaign_id
    ),
    owner_count = (
      SELECT COUNT(DISTINCT oh.owner_id)
      FROM campaigns_housing ch
      JOIN owners_housing oh
        ON oh.housing_id = ch.housing_id
       AND oh.housing_geo_code = ch.housing_geo_code
       AND oh.rank = 1
      WHERE ch.campaign_id = v_campaign_id
    ),
    return_count = CASE
      WHEN v_sent_at IS NOT NULL THEN (
        SELECT COUNT(DISTINCT ch2.housing_id)
        FROM campaigns_housing ch2
        WHERE ch2.campaign_id = v_campaign_id
          AND EXISTS (
            SELECT 1
            FROM housing_events he
            JOIN events e ON e.id = he.event_id
            WHERE he.housing_geo_code = ch2.housing_geo_code
              AND he.housing_id       = ch2.housing_id
              AND e.type IN ('housing:status-updated', 'housing:occupancy-updated')
              AND e.created_at        > v_sent_at
          )
      )
      ELSE return_count
    END
  WHERE id = v_campaign_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_campaign_counts
AFTER INSERT OR DELETE ON campaigns_housing
FOR EACH ROW
EXECUTE FUNCTION update_campaign_counts();
```

---

### `trg_update_campaign_owner_count`

**Table:** `owners_housing` — **Timing:** `AFTER INSERT OR DELETE OR UPDATE OF rank FOR EACH ROW`

Fires when a primary-owner relationship changes. Updates `owner_count` for every campaign that contains the affected housing.

**Early exit conditions (no DB writes):**
- INSERT with `rank != 1`
- DELETE with `rank != 1`
- UPDATE where neither `OLD.rank` nor `NEW.rank` is 1

```sql
CREATE OR REPLACE FUNCTION update_campaign_owner_count()
RETURNS TRIGGER AS $$
DECLARE
  v_campaign_id      UUID;
  v_housing_id       UUID;
  v_housing_geo_code VARCHAR(255);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.rank != 1 THEN RETURN NEW; END IF;
    v_housing_id := NEW.housing_id;
    v_housing_geo_code := NEW.housing_geo_code;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.rank != 1 THEN RETURN OLD; END IF;
    v_housing_id := OLD.housing_id;
    v_housing_geo_code := OLD.housing_geo_code;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.rank != 1 AND NEW.rank != 1 THEN RETURN NEW; END IF;
    v_housing_id := NEW.housing_id;
    v_housing_geo_code := NEW.housing_geo_code;
  END IF;

  FOR v_campaign_id IN (
    SELECT campaign_id FROM campaigns_housing
    WHERE housing_id = v_housing_id
      AND housing_geo_code = v_housing_geo_code
  ) LOOP
    UPDATE campaigns
    SET owner_count = (
      SELECT COUNT(DISTINCT oh.owner_id)
      FROM campaigns_housing ch
      JOIN owners_housing oh
        ON oh.housing_id = ch.housing_id
       AND oh.housing_geo_code = ch.housing_geo_code
       AND oh.rank = 1
      WHERE ch.campaign_id = v_campaign_id
    )
    WHERE id = v_campaign_id;
  END LOOP;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_campaign_owner_count
AFTER INSERT OR DELETE OR UPDATE OF rank ON owners_housing
FOR EACH ROW
EXECUTE FUNCTION update_campaign_owner_count();
```

---

## Group housing count and owner count

**Introduced in:** migration `20260407174838_groups-add-counts.ts`

### What are these columns?

| Column | Type | Description |
|--------|------|-------------|
| `housing_count` | `integer` | Number of housings attached to the group via `groups_housing` |
| `owner_count` | `integer` | Number of distinct primary owners (`rank = 1`) across those housings |

These replace a `LEFT JOIN LATERAL COUNT(DISTINCT …)` that was computed on every listing request, causing ~8s latency for large groups (e.g. 90k housings).

### Three-trigger design

| Trigger | Table | Timing | Updates |
|---------|-------|--------|---------|
| `trg_update_group_counts_after_insert` | `groups_housing` | `AFTER INSERT` (statement-level) | `housing_count`, `owner_count` (full recompute, once per affected group_id) |
| `trg_update_group_counts_after_delete` | `groups_housing` | `AFTER DELETE` (statement-level) | `housing_count`, `owner_count` (full recompute, once per affected group_id) |
| `trg_update_group_owner_count` | `owners_housing` | `AFTER INSERT OR DELETE OR UPDATE OF rank` | `owner_count` only (full recompute per row) |

The `groups_housing` triggers use `FOR EACH STATEMENT` with transition tables (`REFERENCING NEW TABLE` / `REFERENCING OLD TABLE`) so that bulk housing additions (e.g. 90k housings at Bordeaux Métropole) trigger a single recompute per affected group rather than O(N) recomputes. Separate INSERT and DELETE triggers are required because PostgreSQL only allows `NEW TABLE` in INSERT triggers and `OLD TABLE` in DELETE triggers.

The `owners_housing` trigger remains `FOR EACH ROW` because ownership changes are rarely bulk operations and the logic must inspect individual row values to early-exit when `rank != 1`.

### `trg_update_group_counts_after_insert`

**Table:** `groups_housing` — **Timing:** `AFTER INSERT FOR EACH STATEMENT`

Uses `REFERENCING NEW TABLE AS new_rows`. Selects all distinct `group_id` values from `new_rows` and recomputes `housing_count` and `owner_count` for each affected group. Fires exactly once per INSERT statement regardless of the number of rows inserted.

### `trg_update_group_counts_after_delete`

**Table:** `groups_housing` — **Timing:** `AFTER DELETE FOR EACH STATEMENT`

Uses `REFERENCING OLD TABLE AS old_rows`. Selects all distinct `group_id` values from `old_rows` and recomputes `housing_count` and `owner_count` for each affected group. Fires exactly once per DELETE statement regardless of the number of rows deleted.

### `trg_update_group_owner_count`

**Table:** `owners_housing` — **Timing:** `AFTER INSERT OR DELETE OR UPDATE OF rank FOR EACH ROW`

**Early exit conditions (no DB writes):**
- INSERT with `rank != 1`
- DELETE with `rank != 1`
- UPDATE where neither `OLD.rank` nor `NEW.rank` is 1

Iterates over all `group_id` values in `groups_housing` that contain the affected housing and recomputes `owner_count` for each.

---

## Full trigger inventory

| Trigger | Table | Timing | Function | Updates |
|---------|-------|--------|----------|---------|
| `trg_increment_return_count` | `housing_events` | `AFTER INSERT` | `increment_campaign_return_count()` | `return_count` (+1 incremental, status-filtered) |
| `trg_recompute_return_count_on_sent_at_change` | `campaigns` | `AFTER UPDATE OF sent_at` | `recompute_campaign_return_count()` | `return_count` (full recompute, status-filtered) |
| `trg_recompute_return_count_on_housing_status_change` | `fast_housing` | `AFTER UPDATE OF status` | `recompute_return_count_on_housing_status_change()` | `return_count` (full recompute, boundary crossings only) |
| `trg_update_campaign_counts` | `campaigns_housing` | `AFTER INSERT OR DELETE` | `update_campaign_counts()` | `housing_count`, `owner_count`, `return_count` (full recompute, status-filtered) |
| `trg_update_campaign_owner_count` | `owners_housing` | `AFTER INSERT OR DELETE OR UPDATE OF rank` | `update_campaign_owner_count()` | `owner_count` (full recompute) |
| `trg_update_group_counts_after_insert` | `groups_housing` | `AFTER INSERT` (statement-level) | `update_group_counts_after_insert()` | `housing_count`, `owner_count` (full recompute, once per affected group) |
| `trg_update_group_counts_after_delete` | `groups_housing` | `AFTER DELETE` (statement-level) | `update_group_counts_after_delete()` | `housing_count`, `owner_count` (full recompute, once per affected group) |
| `trg_update_group_owner_count` | `owners_housing` | `AFTER INSERT OR DELETE OR UPDATE OF rank` | `update_group_owner_count()` | `owner_count` (full recompute) |
