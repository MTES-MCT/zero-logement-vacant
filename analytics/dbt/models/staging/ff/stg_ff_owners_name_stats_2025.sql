-- stg_ff_owners_name_stats_2025.sql
-- Pre-computes name uniqueness stats from FF25 owners.
-- Used by cascade matching: if a name has only 1 idpersonne, no geo disambiguation needed.
-- Materialized as TABLE for performance.

{{ config(materialized='table') }}

SELECT
    owner_fullname_concat,
    COUNT(DISTINCT idpersonne) AS nb_idpersonne,
    CASE
        WHEN COUNT(DISTINCT idpersonne) = 1 THEN MIN(idpersonne)
        ELSE NULL
    END AS unique_idpersonne
FROM {{ ref('stg_ff_owners_idperson_2025') }}
GROUP BY owner_fullname_concat
