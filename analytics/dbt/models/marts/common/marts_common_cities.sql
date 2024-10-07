SELECT
    ccm.city_code,
    MIN(label) AS label,  -- Si le label est le même pour tous les arrondissements, sinon utiliser GROUP_CONCAT
    MIN(zip_code) AS zip_code,  -- Pour prendre un code postal représentatif, sinon utiliser GROUP_CONCAT
    AVG(latitude) AS avg_latitude,
    AVG(longitude) AS avg_longitude,
    MIN(department_name) AS department_name,  -- Même remarque que pour le label
    MIN(department_number) AS department_number,
    MIN(region_name) AS region_name,
    MIN(region_geojson_name) AS region_geojson_name,
    SUM(vac_2024_moins_1an) AS total_vac_2024_moins_1an,
    SUM(vac_2024_1an) AS total_vac_2024_1an,
    SUM(vac_2024_2ans) AS total_vac_2024_2ans,
    SUM(vac_2024_3ans) AS total_vac_2024_3ans,
    SUM(vac_2024_4ans_plus) AS total_vac_2024_4ans_plus,
    SUM(vac_2023_moins_1an) AS total_vac_2023_moins_1an,
    SUM(vac_2023_1an) AS total_vac_2023_1an,
    SUM(vac_2023_2ans) AS total_vac_2023_2ans,
    SUM(vac_2023_3ans) AS total_vac_2023_3ans,
    SUM(vac_2023_4ans_plus) AS total_vac_2023_4ans_plus,
    SUM(vac_2023_total) AS total_vac_2023_total,
    SUM(vac_2024_total) AS total_vac_2024_total,
    SUM(vac_2024_plus_2ans) AS total_vac_2024_plus_2ans,
    SUM(vac_2024_moins_2ans) AS total_vac_2024_moins_2ans,

    SUM(vac_2020_moins_1an) AS total_vac_2020_moins_1an,
    SUM(vac_2020_1an) AS total_vac_2020_1an,
    SUM(vac_2020_2ans) AS total_vac_2020_2ans,
    SUM(vac_2020_3ans) AS total_vac_2020_3ans,
    SUM(vac_2020_4ans_plus) AS total_vac_2020_4ans_plus,
    SUM(vac_2020_total) AS total_vac_2020_total,
    SUM(ext_2023_gc.nombre_logements) AS nombre_logements_prives_2023,
    SUM(ext_2020_gc.nombre_logements) AS nombre_logements_prives_2020,

    100 * (SUM(vac_2024_plus_2ans)  / SUM(ext_2023_gc.nombre_logements)) AS part_logement_vacants_plus_2ans_2024_parc_prive_2023, --Part des logements vacants >2 ans en 2024
    100 * (SUM(vac_2024_moins_2ans)  / SUM(ext_2023_gc.nombre_logements)) AS part_logement_vacants_moins_2ans_2024_parc_prive_2023, -- Part des logements ≤ 2 ans en 2023
    100 * (SUM(vac_2023_total)  / SUM(ext_2023_gc.nombre_logements)) AS part_logement_vacants_2023_parc_prive_2023,-- Part des logements vacants en 2024
    100 * (SUM(vac_2024_total)  / SUM(ext_2023_gc.nombre_logements)) AS part_logement_vacants_2024_parc_prive_2023,-- Part des logements vacants en 2023
    MAX(ca1.is_in) AS tlv1,  -- Prend 1 s'il y a au moins un arrondissement où la valeur est 1
    MAX(ca2.is_in) AS tlv2,  -- Idem
    MAX(action_coeur_de_ville) AS action_coeur_de_ville,
    MAX(action_coeur_de_ville_1) AS action_coeur_de_ville_1,
    MAX(petite_ville_de_demain) AS petite_ville_de_demain,
    MAX(village_davenir) AS village_davenir,
    MAX(opah) AS opah,
    MIN(type_opah) AS type_opah,  -- Supposant que type_opah soit le même pour tous les arrondissements
    MAX(pig) AS pig,
    MAX(cort.signed) as ort_signed,
    MAX(cort.signed_at) as ort_signed_at,
    MAX(cf.has_fusion) AS has_fusion,
    MAX(cf.libelle_source) AS fusion_libelle_source,
    MAX(cf.libelle_destination) AS fusion_libelle_destination,
    MAX(cf.geo_code_source) AS fusion_geo_code_source,
    MAX(cf.year) as fusion_date,
    MAX(cs.has_scission) AS has_scission,
    MAX(cs.libelle_source) AS scission_libelle_source,
    MAX(cs.libelle_destination) AS scission_libelle_destination,
    MAX(cs.geo_code_source) AS scission_geo_code_source,
    MAX(cs.year) as scission_date,
    MAX(UU_name) as uu_name,
    MAX(UU_code) as uu_code,
    MAX(EPCI_code) as epci_code,
    MAX(EPCI_name) as epci_name, 
    MAX(inscrit_zlv_direct) AS inscrit_zlv_direct,
    MAX(inscrit_zlv_via_intercommunalité) AS inscrit_zlv_via_intercommunalité,
    MAX(nom_intercommunalité) AS nom_intercommunalité,
    MAX(type_intercommunalité ) AS type_intercommunalité,
    MAX(couverte_via_service_etat) AS couverte_via_service_etat,
    MAX(department_state_service_name) AS nom_service_etat_departemental,
    MAX(region_state_service_name) AS nom_service_etat_régional
FROM 
    {{ ref('int_common_cities') }} cc
LEFT JOIN {{ ref('int_common_cities_mapping') }} ccm ON ccm.geo_code = cc.geo_code
LEFT JOIN {{ ref('int_common_article_232_1') }} ca1 ON ca1.geo_code = ccm.city_code -- les données des articles 1 et 2 sont basé sur les codes insee des villes et non des arrondissements
LEFT JOIN {{ ref('int_common_article_232_2') }} ca2 ON ca2.geo_code = ccm.city_code -- les données des articles 1 et 2 sont basé sur les codes insee des villes et non des arrondissements
LEFT JOIN {{ ref('int_common_ngeo_anct_cog_2023') }} ncac ON ncac.geo_code = cc.geo_code
LEFT JOIN {{ ref('int_common_table_appartenance') }} cta ON cta.geo_code = cc.geo_code
LEFT JOIN {{ ref('int_common_fusions') }} cf ON cf.geo_code_destination = cc.geo_code
LEFT JOIN {{ ref('int_common_scissions') }} cs ON cs.geo_code_destination = cc.geo_code
LEFT JOIN {{ ref('int_common_opah') }} co ON co.geo_code = cc.geo_code
LEFT JOIN {{ ref('int_lovac_geo_code') }} lgc ON lgc.geo_code = cc.geo_code
LEFT JOIN {{ ref('int_ff_ext_2023_geo_code') }} ext_2023_gc ON ext_2023_gc.geo_code = cc.geo_code
LEFT JOIN {{ ref('int_ff_ext_2020_geo_code') }} ext_2020_gc ON ext_2020_gc.geo_code = cc.geo_code
LEFT JOIN {{ ref('int_common_ort') }} cort ON ccm.city_code = cort.geo_code
LEFT JOIN {{ ref('int_production_geo_code_establishments') }} gce ON gce.geo_code = cc.geo_code
GROUP BY
    ccm.city_code
ORDER BY
    ccm.city_code