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
    SUM(ext_2023_gc.nombre_logements) AS nombre_logements_prives_2023,
    MAX(ca1.is_in) AS tlv1,  -- Prend 1 s'il y a au moins un arrondissement où la valeur est 1
    MAX(ca2.is_in) AS tlv2,  -- Idem
    MAX(action_coeur_de_ville) AS action_coeur_de_ville,
    MAX(action_coeur_de_ville_1) AS action_coeur_de_ville_1,
    MAX(petite_ville_de_demain) AS petite_ville_de_demain,
    MAX(village_davenir) AS village_davenir,
    MAX(opah) AS opah,
    MIN(type_opah) AS type_opah,  -- Supposant que type_opah soit le même pour tous les arrondissements
    MAX(pig) AS pig
FROM 
    {{ ref('int_common_cities') }} cc
LEFT JOIN {{ ref('int_common_cities_mapping') }} ccm ON ccm.geo_code = cc.geo_code
LEFT JOIN {{ ref('int_common_article_232_1') }} ca1 ON ca1.geo_code = ccm.city_code -- les données des articles 1 et 2 sont basé sur les codes insee des villes et non des arrondissements
LEFT JOIN {{ ref('int_common_article_232_2') }} ca2 ON ca2.geo_code = ccm.city_code -- les données des articles 1 et 2 sont basé sur les codes insee des villes et non des arrondissements
LEFT JOIN {{ ref('int_common_ngeo_anct_cog_2023') }} ncac ON ncac.geo_code = cc.geo_code
LEFT JOIN {{ ref('int_common_opah') }} co ON co.geo_code = cc.geo_code
LEFT JOIN {{ ref('int_lovac_geo_code') }} lgc ON lgc.geo_code = cc.geo_code
LEFT JOIN {{ ref('int_ff_ext_2023_geo_code') }} ext_2023_gc ON ext_2023_gc.geo_code = cc.geo_code
GROUP BY 
    ccm.city_code
ORDER BY 
    ccm.city_code