-- Test de régression : le nombre de lignes dans marts_analysis_sortie_vacance_features
-- doit correspondre à la taille de la cohorte mesurée (2 530 118 ± 1 000 de tolérance).
-- Un écart supérieur indique une jointure qui ajoute ou supprime des lignes.

{{ config(severity='error', error_if='>0') }}

WITH cohort_count AS (
    SELECT COUNT(*) AS n
    FROM {{ ref('marts_analysis_sortie_vacance_features') }}
),

check AS (
    SELECT
        n,
        ABS(n - 2530118) AS delta,
        'Nombre de lignes hors tolérance: ' || n || ' (attendu 2530118 ± 1000)' AS issue
    FROM cohort_count
    WHERE ABS(n - 2530118) > 1000
)

SELECT * FROM check
