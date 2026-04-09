-- int_zlovac_evol_housing_owners.sql
-- Identifies housing where ownership has changed between LOVAC 2025 and 2026.
-- Two types of evolution:
--   1. Account change: idprocpte 2026 != idprocpte 2025
--   2. Ownership order change: same idprocpte but different idprodrois

WITH lovac_2026 AS (
    SELECT
        ff_idlocal AS local_id,
        ff_idprocpte AS idprocpte_2026,
        -- Concatenate sorted idprodroits to detect set changes
        LIST_SORT(LIST_VALUE(
            ff_idprodroit_1, ff_idprodroit_2, ff_idprodroit_3,
            ff_idprodroit_4, ff_idprodroit_5, ff_idprodroit_6
        ).list_filter(x -> x IS NOT NULL))::VARCHAR AS idprodrois_2026
    FROM {{ ref('int_lovac_fil_2026') }}
    WHERE ff_idlocal IS NOT NULL
),

lovac_2025 AS (
    SELECT
        ff_idlocal AS local_id,
        ff_idprocpte AS idprocpte_2025,
        LIST_SORT(LIST_VALUE(
            ff_idprodroit_1, ff_idprodroit_2, ff_idprodroit_3,
            ff_idprodroit_4, ff_idprodroit_5, ff_idprodroit_6
        ).list_filter(x -> x IS NOT NULL))::VARCHAR AS idprodrois_2025
    FROM {{ ref('int_lovac_fil_2025') }}
    WHERE ff_idlocal IS NOT NULL
),

joined AS (
    SELECT
        COALESCE(l26.local_id, l25.local_id) AS local_id,
        l25.idprocpte_2025,
        l26.idprocpte_2026,
        l25.idprodrois_2025,
        l26.idprodrois_2026,
        CASE
            WHEN l25.local_id IS NULL THEN 'new_in_2026'
            WHEN l26.local_id IS NULL THEN 'gone_in_2026'
            WHEN l26.idprocpte_2026 IS DISTINCT FROM l25.idprocpte_2025
                THEN 'account_change'
            WHEN l26.idprocpte_2026 IS NOT DISTINCT FROM l25.idprocpte_2025
                AND l26.idprodrois_2026 IS DISTINCT FROM l25.idprodrois_2025
                THEN 'ownership_order_change'
            ELSE 'no_change'
        END AS evolution_type
    FROM lovac_2026 l26
    FULL OUTER JOIN lovac_2025 l25
        ON l26.local_id = l25.local_id
)

SELECT *
FROM joined
WHERE evolution_type != 'no_change'
