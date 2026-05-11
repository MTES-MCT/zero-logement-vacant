"""SQL predicates for BAN daily sync.

Candidate selection rules:
- Never geocoded: no row in ban_addresses → process.
- Edited frontend (owners only): ban_id IS NULL AND score = 1 → resync immediately.
- Stale not-found: ban_id IS NULL AND last_updated_at < now() - ttl_not_found.
- Stale low score: score < 1 AND last_updated_at < now() - ttl_low_score.
- Healthy (ban_id NOT NULL AND score = 1): never retry.

ORDER BY id + LIMIT gives stable pagination: each upsert refreshes
last_updated_at so processed rows exit the predicate naturally.
"""

OWNERS_DAILY_SQL = """
SELECT o.id AS ref_id,
       array_to_string(o.address_dgfip, ' ') AS address_dgfip
FROM owners o
LEFT JOIN ban_addresses ba
  ON ba.ref_id = o.id AND ba.address_kind = 'Owner'
WHERE o.address_dgfip IS NOT NULL
  AND (
    ba.ref_id IS NULL
    OR (ba.ban_id IS NULL AND ba.score = 1)
    OR (
      ba.ban_id IS NULL
      AND ba.last_updated_at < now() - make_interval(days => %(ttl_not_found)s)
    )
    OR (
      ba.score < 1
      AND ba.last_updated_at < now() - make_interval(days => %(ttl_low_score)s)
    )
  )
ORDER BY o.id
LIMIT %(limit)s;
"""

HOUSINGS_DAILY_SQL = """
SELECT fh.id AS ref_id,
       array_to_string(fh.address_dgfip, ' ') AS address_dgfip,
       fh.geo_code
FROM fast_housing fh
LEFT JOIN ban_addresses ba
  ON ba.ref_id = fh.id AND ba.address_kind = 'Housing'
WHERE fh.address_dgfip IS NOT NULL
  AND (
    ba.ref_id IS NULL
    OR (
      ba.ban_id IS NULL
      AND ba.last_updated_at < now() - make_interval(days => %(ttl_not_found)s)
    )
    OR (
      ba.score < 1
      AND ba.last_updated_at < now() - make_interval(days => %(ttl_low_score)s)
    )
  )
ORDER BY fh.id
LIMIT %(limit)s;
"""
