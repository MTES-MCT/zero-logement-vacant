-- Test : chaque unité de la cohorte doit apparaître au moins une fois dans le panel.
-- Une unité absente du panel signifie que int_lovac_history_housing ne contient pas
-- son local_id, ce qui indiquerait un problème de correspondance housing_id ↔ local_id.

{{ config(severity='warn', error_if='>5000') }}

WITH cohort AS (
    SELECT housing_id
    FROM {{ ref('int_analysis_housing_with_out_flag') }}
),

panel_housing AS (
    SELECT DISTINCT housing_id
    FROM {{ ref('int_analysis_lovac_presence_panel') }}
),

missing AS (
    SELECT
        c.housing_id,
        'Unité cohorte absente du panel' AS issue
    FROM cohort c
    LEFT JOIN panel_housing p ON c.housing_id = p.housing_id
    WHERE p.housing_id IS NULL
)

SELECT * FROM missing
