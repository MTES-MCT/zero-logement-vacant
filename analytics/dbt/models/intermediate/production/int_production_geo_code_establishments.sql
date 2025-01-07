WITH establishment_info AS (
    SELECT
        loc.geo_code,
        est.id AS establishment_id,
        est.name AS establishment_name,
        est.kind AS establishment_kind,
        est.establishment_kind_label,
        est.covered_by_state_service
    FROM
    {{ ref ('int_production_establishments_localities') }} loc
    LEFT JOIN {{ ref ('int_production_establishments') }} est
    ON loc.establishment_id = est.id
    LEFT JOIN {{ ref ('int_production_establishments_users') }} est_users
    ON est.id = est_users.establishment_id
    WHERE user_number > 0
)

SELECT
    geo_code,
    MAX(CASE
        WHEN establishment_kind = 'Commune' THEN TRUE
        ELSE FALSE
    END) AS inscrit_zlv_direct,
    MAX(CASE
        WHEN establishment_kind IN ('CA', 'CC', 'CU', 'ME') THEN TRUE
        ELSE FALSE
    END) AS inscrit_zlv_via_intercommunalit
é,
    MAX(CASE 
        WHEN establishment_kind IN ('CA', 'CC', 'CU', 'ME') THEN establishment_name
        ELSE NULL
    END) AS nom_intercommunalité,
    MAX(CASE 
        WHEN establishment_kind IN ('CA', 'CC', 'CU', 'ME') THEN establishment_kind_label
        ELSE NULL
    END) AS type_intercommunalité,
    MAX(covered_by_state_service) AS couverte_via_service_etat,
    MAX(CASE 
        WHEN establishment_kind = 'SDED' THEN establishment_name
        ELSE NULL
    END) AS department_state_service_name,
    MAX(CASE 
        WHEN establishment_kind = 'SDER' THEN establishment_name
        ELSE NULL
    END) AS region_state_service_name
FROM 
    establishment_info
GROUP BY 
    geo_code
ORDER BY 
    geo_code