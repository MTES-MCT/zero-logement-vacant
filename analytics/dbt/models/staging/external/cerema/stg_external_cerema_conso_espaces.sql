-- Staging model for CEREMA Consommation d'espaces naturels, agricoles et forestiers
-- Source: https://www.data.gouv.fr/api/1/datasets/r/8c67a68a-bb1a-4b7e-b221-62ccfb8bc4f9
-- Period: 2009-2024

WITH source AS (
    SELECT * FROM {{ source('external_cerema', 'cerema_conso2009_2024_resultats_com_raw') }}
),

renamed AS (
    SELECT
        -- Primary key - Code commune INSEE
        CAST(idcom AS VARCHAR) AS geo_code,
        
        -- Commune name
        idcomtxt AS commune_name,
        
        -- Department code
        CAST(iddep AS VARCHAR) AS department_code,
        
        -- Region code
        CAST(idreg AS VARCHAR) AS region_code,
        
        -- EPCI code
        CAST(epci24 AS VARCHAR) AS epci_code,
        
        -- Consommation totale NAF (Naturel Agricole Forestier) en hectares
        TRY_CAST(naf09art24 AS DOUBLE) AS conso_naf_total_ha,
        
        -- Consommation annuelle (si disponible)
        TRY_CAST(artcom0924 AS DOUBLE) AS conso_art_2009_2024_ha,
        
        -- Consommation habitat
        TRY_CAST(art09act24 AS DOUBLE) AS conso_activite_ha,
        TRY_CAST(art09hab24 AS DOUBLE) AS conso_habitat_ha,
        TRY_CAST(art09mix24 AS DOUBLE) AS conso_mixte_ha,
        TRY_CAST(art09inc24 AS DOUBLE) AS conso_inconnu_ha,
        
        -- Surface communale
        TRY_CAST(surfcom2024 AS DOUBLE) AS surface_commune_ha,
        
        -- Population
        TRY_CAST(pop15 AS BIGINT) AS population_2015,
        TRY_CAST(pop21 AS BIGINT) AS population_2021,
        
        -- Nombre de ménages
        TRY_CAST(men15 AS BIGINT) AS menages_2015,
        TRY_CAST(men21 AS BIGINT) AS menages_2021,
        
        -- Emplois
        TRY_CAST(emp15 AS BIGINT) AS emplois_2015,
        TRY_CAST(emp21 AS BIGINT) AS emplois_2021

    FROM source
    WHERE idcom IS NOT NULL
)

SELECT * FROM renamed

