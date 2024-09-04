SELECT
    cc.*, 
    lgc.*,
    ca1.is_in as tlv1,
    ca2.is_in as tlv2,
    ncac.action_coeur_de_ville,
    ncac.action_coeur_de_ville,
    ncac.petite_ville_de_demain,
    ncac.village_davenir,
    co.opah,
    co.type_opah,
    co.pig
FROM {{ ref('int_common_cities')}} cc
LEFT JOIN {{ref('int_common_article_232_1')}} ca1 ON ca1.geo_code = cc.geo_code
LEFT JOIN {{ref('int_common_article_232_2')}} ca2 ON ca2.geo_code = cc.geo_code
LEFT JOIN {{ref('int_common_ngeo_anct_cog_2023')}} ncac ON ncac.geo_code = cc.geo_code
LEFT JOIN {{ref('int_common_opah')}} co ON co.geo_code = cc.geo_code
LEFT JOIN {{ref('int_lovac_geo_code')}} lgc ON lgc.geo_code = cc.geo_code