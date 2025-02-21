SELECT
    ccm.city_code,
    MIN(cc.libelle) AS label,
    MIN(cc.department_code) AS department_code,
    MIN(cc.region_code) AS region_code,
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
    MAX(UU_name) as uu_name,
    MAX(cta.UU_code) as uu_code,
    MAX(cta.EPCI_code) as epci_code,
    MAX(cta.EPCI_name) as epci_name, 
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
LEFT JOIN {{ ref('int_common_opah') }} co ON co.geo_code = cc.geo_code
LEFT JOIN {{ ref('int_common_ort') }} cort ON ccm.city_code = cort.geo_code
LEFT JOIN {{ ref('int_production_geo_code_establishments') }} gce ON gce.geo_code = cc.geo_code
GROUP BY
    ccm.city_code
ORDER BY
    ccm.city_code