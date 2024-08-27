WITH filtered_data as (
    SELECT * FROM {{ ref("stg_zlovac")}}
        WHERE
            ff_ccthp IN ('V')
            -- - 2 ans 
            AND vacancy_start_year < data_year - 2
            AND (groupe NOT IN (1, 2, 3, 4, 5, 6, 9) OR groupe is NULL)
            AND aff = 'H'
            AND housing_kind IN ('APPART', 'MAISON')
            AND local_id IS NOT NULL
            AND ff_owner_1_fullname IS NOT NULL
)
SELECT * FROM filtered_data

-- Quand gestionnaire alors propriétaire principal et score à 10 reason = 
-- Ajouter une colonne adminsitrateur = YES 
-- Ajouter une colonne reason = gestionnaire