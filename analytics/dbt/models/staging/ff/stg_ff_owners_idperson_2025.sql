-- stg_ff_owners_idperson_2025.sql
-- Joins FF25 owner name and address tables to produce a single reference
-- for matching CER 1767 owners by name + address.
-- Materialized as TABLE for performance (60M+ rows in source).

{{ config(materialized='table') }}

WITH names AS (
    SELECT DISTINCT
        idpersonne,
        UPPER(TRIM(CONCAT_WS(' ', dqualp, dnomus, dprnus))) AS owner_fullname_concat
    FROM {{ source('duckdb_raw', 'cerema_owners_idperson_2025_raw') }}
    WHERE dnomus IS NOT NULL AND TRIM(dnomus) != ''
),

addresses AS (
    SELECT DISTINCT
        idpersonne,
        UPPER(TRIM(CONCAT_WS(' ',
            NULLIF(TRIM(dlign3), ''),
            NULLIF(TRIM(dlign4), ''),
            NULLIF(TRIM(dlign5), ''),
            NULLIF(TRIM(dlign6), '')
        ))) AS owner_full_address,
        ccogrm
    FROM {{ source('duckdb_raw', 'cerema_owners_idperson_address_2025_raw') }}
)

SELECT
    n.idpersonne,
    n.owner_fullname_concat,
    a.owner_full_address,
    a.ccogrm
FROM names n
JOIN addresses a ON n.idpersonne = a.idpersonne
