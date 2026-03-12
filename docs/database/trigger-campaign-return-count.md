# Database Triggers

## Campaign return count

**Introduced in:** migration `20260304_campaigns-add-return-count.ts`

### What is the return count?

`campaigns.return_count` is the number of **distinct housings** in a campaign that had at least one `housing:status-updated` or `housing:occupancy-updated` event created **after** the campaign's `sent_at` date.

It is displayed in the campaign view as "Nombre de retours". The return rate ("Taux de retour") is derived on the frontend: `returnCount / housingCount`.

`return_count` is `null`-equivalent (meaningless) when `campaigns.sent_at IS NULL` — the frontend treats it as "En attente de la date d'envoi" in that case.

### Why triggers instead of a query?

Reads (campaign view loads) are far more frequent than writes (new events, `sent_at` updates). Computing this on every read would require a full aggregation join across `housing_events` and `events`. Two triggers keep the column always up to date at write time.

### Two-trigger design

Two separate triggers are required because the two events that invalidate `return_count` happen on **different tables**. PostgreSQL triggers are always bound to a single table.

| Trigger | Table | Timing | Strategy |
|---------|-------|--------|----------|
| `trg_increment_return_count` | `housing_events` | `AFTER INSERT` | **Incremental** — `+1` if this is the first qualifying event for a housing/campaign pair |
| `trg_recompute_return_count_on_sent_at_change` | `campaigns` | `AFTER UPDATE OF sent_at` | **Full recompute** — recounts from scratch because changing `sent_at` can qualify or disqualify any previously inserted events |

The incremental strategy is used for `housing_events` because it is the hot path (many events, frequent). The full recompute strategy is used for `sent_at` changes because they are rare and the incremental approach cannot handle retroactive qualification of existing events.

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
  -- at least one qualifying event created after the new sent_at.
  UPDATE campaigns
  SET return_count = (
    SELECT COUNT(DISTINCT ch.housing_id)
    FROM campaigns_housing ch
    WHERE ch.campaign_id = NEW.id
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

## Known limitations

- `trg_increment_return_count` fires on INSERT only. If a `housing_events` row is deleted (which should not happen in normal operation due to cascade constraints), `return_count` is not decremented. A full recompute via `trg_recompute_return_count_on_sent_at_change` (by touching `sent_at`) would correct it.
- Neither trigger fires on `UPDATE` of `events.type` or `events.created_at`. These columns are considered immutable after creation.
