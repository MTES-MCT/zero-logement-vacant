-- Verify the fix-housing-sub-status repair. Run each query BEFORE `apply` and
-- AFTER `apply`, and compare. (The definitive coverage check is to re-run
-- `generate`: it should report ~0 housings to repair after apply.)

-- 1) COVERAGE — housings still holding an invalid (status, sub_status) pair.
--    BEFORE apply: ~17,398.  AFTER apply: ~0.
--    Apostrophe-robust: the DB value is normalised (typographic U+2019 -> ')
--    before comparing against the current valid sub-status sets.
WITH valid (status, sub_status) AS (
  VALUES
    (2, 'Intérêt potentiel / En réflexion'),
    (2, 'En pré-accompagnement'),
    (2, 'N''habite pas à l''adresse indiquée'),
    (3, 'En accompagnement'),
    (3, 'Intervention publique'),
    (3, 'En sortie sans accompagnement'),
    (3, 'Mutation en cours ou effectuée'),
    (4, 'Sortie de la vacance'),
    (4, 'N''était pas vacant'),
    (4, 'Sortie de la passoire énergétique'),
    (4, 'N''était pas une passoire énergétique'),
    (4, 'Autre objectif rempli'),
    (5, 'Blocage involontaire du propriétaire'),
    (5, 'Blocage volontaire du propriétaire'),
    (5, 'Immeuble / Environnement'),
    (5, 'Tiers en cause')
)
SELECT count(*) AS invalid_pairs
FROM fast_housing h
WHERE (
    h.status IN (2, 3, 4, 5)
    AND (
      h.sub_status IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM valid v
        WHERE v.status = h.status
          AND v.sub_status = translate(h.sub_status, chr(8217), chr(39))
      )
    )
  )
  OR (h.status IN (0, 1) AND h.sub_status IS NOT NULL);

-- 2) The two apostrophe-free sub-shapes (a quick sanity subset of #1).
--    BEFORE: null_sub ~15,700, forbidden_sub ~12.  AFTER: both 0.
SELECT
  count(*) FILTER (WHERE status IN (2, 3, 4, 5) AND sub_status IS NULL) AS null_sub,
  count(*) FILTER (WHERE status IN (0, 1) AND sub_status IS NOT NULL) AS forbidden_sub
FROM fast_housing;

-- 3) STATUS SHIFT — snapshot before and after; the diff should be
--    ≈ +10,815 to status 0 (Non suivi) and ≈ +6,322 to status 4 (Suivi terminé).
SELECT status, count(*) AS n FROM fast_housing GROUP BY status ORDER BY status;

-- 4) EVENTS — the audit delta. Should increase by 14,272 − 282 = +13,990 net.
SELECT count(*) AS status_updated_events
FROM events
WHERE type = 'housing:status-updated';
