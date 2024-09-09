SELECT 
    insee_com as geo_code,
    CASE WHEN id_acv IS NOT NULL THEN TRUE ELSE FALSE END as action_coeur_de_ville, 
    CASE WHEN id_acv2 IS NOT NULL THEN TRUE ELSE FALSE END as action_coeur_de_ville, 
    CASE WHEN id_pvd IS NOT NULL THEN TRUE ELSE FALSE END as petite_ville_de_demain, 
    CASE WHEN id_va IS NOT NULL THEN TRUE ELSE FALSE END as village_davenir
FROM {{ ref('stg_common_ngeo_anct_cog_2023')}}
