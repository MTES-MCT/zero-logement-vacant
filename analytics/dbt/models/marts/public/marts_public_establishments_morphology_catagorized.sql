WITH establishments AS (
    SELECT 
        id AS establishment_id,
        kind AS establishment_kind,
        CASE
            WHEN kind = 'Commune' THEN 1
            WHEN kind IN ('CC', 'CA', 'ME', 'CU') THEN 2
            WHEN kind IN ('SDED', 'DEP') THEN 3
            WHEN kind IN ('SDER', 'REG') THEN 4
            ELSE NULL
        END AS establishment_echelon
    FROM {{ ref('int_production_establishments') }}
),

base_morphology AS (
    SELECT * FROM {{ ref('marts_public_establishments_morphology') }}
),

-- Calculer les valeurs de base pour chaque établissement et année
establishment_yearly_data AS (
    SELECT
        bm.establishment_id,
        e.establishment_kind,
        e.establishment_echelon,
        bm.year,
        bm.count_vacant_housing_private_fil_ccthp,
        bm.count_housing_private,
        -- Calcul du taux de vacance
        CASE 
            WHEN bm.count_housing_private > 0 
            THEN ROUND((bm.count_vacant_housing_private_fil_ccthp::FLOAT / bm.count_housing_private) * 100, 2)
            ELSE 0 
        END AS housing_vacant_rate
    FROM base_morphology bm
    JOIN establishments e ON bm.establishment_id = e.establishment_id
),

-- Statistiques pour tous les établissements par année
global_stats AS (
    SELECT
        year,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY count_vacant_housing_private_fil_ccthp) AS median_vacant_housing,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY housing_vacant_rate) AS median_vacant_rate
    FROM establishment_yearly_data
    GROUP BY year
),

-- Statistiques par échelon d'établissement
echelon_stats AS (
    SELECT
        establishment_echelon,
        year,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY count_vacant_housing_private_fil_ccthp) AS median_vacant_housing_echelon,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY housing_vacant_rate) AS median_vacant_rate_echelon
    FROM establishment_yearly_data
    WHERE establishment_echelon IS NOT NULL
    GROUP BY establishment_echelon, year
),

-- Calculer les quartiles pour la répartition 
vacant_housing_quartiles AS (
    SELECT
        year,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY count_vacant_housing_private_fil_ccthp) AS q1_vacant_housing,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY count_vacant_housing_private_fil_ccthp) AS q2_vacant_housing,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY count_vacant_housing_private_fil_ccthp) AS q3_vacant_housing,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY housing_vacant_rate) AS q1_vacant_rate,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY housing_vacant_rate) AS q2_vacant_rate,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY housing_vacant_rate) AS q3_vacant_rate
    FROM establishment_yearly_data
    GROUP BY year
),

-- Données 2019 et 2023 pour calculer les évolutions
data_2019 AS (
    SELECT 
        establishment_id,
        count_vacant_housing_private_fil_ccthp AS vacant_housing_2019,
        housing_vacant_rate AS vacant_rate_2019
    FROM establishment_yearly_data
    WHERE year = 2019
),

data_2023 AS (
    SELECT 
        establishment_id,
        count_vacant_housing_private_fil_ccthp AS vacant_housing_2023,
        housing_vacant_rate AS vacant_rate_2023
    FROM establishment_yearly_data
    WHERE year = 2023
),

data_2024 AS (
    SELECT 
        establishment_id,
        count_vacant_housing_private_fil_ccthp AS vacant_housing_2024,
        housing_vacant_rate AS vacant_rate_2024
    FROM establishment_yearly_data
    WHERE year = 2024
),
data_2025 AS (
    SELECT 
        establishment_id,
        count_vacant_housing_private_fil_ccthp AS vacant_housing_2024,
        housing_vacant_rate AS vacant_rate_2024
    FROM establishment_yearly_data
    WHERE year = 2025
),

-- Calcul des évolutions
evolution_data AS (
    SELECT
        d24.establishment_id,
        -- Évolution 2019-2024
        (d24.vacant_housing_2024 - d19.vacant_housing_2019) AS housing_vacant_evolution_19_24,
        (d24.vacant_rate_2024 - d19.vacant_rate_2019) AS housing_vacant_rate_evolution_19_24,
        -- Évolution 2019-2025
        (d24.vacant_housing_2025 - d19.vacant_housing_2019) AS housing_vacant_evolution_19_25,
        (d24.vacant_rate_2025 - d19.vacant_rate_2019) AS housing_vacant_rate_evolution_19_25,
        -- Évolution 2023-2024
        (d24.vacant_housing_2024 - d23.vacant_housing_2023) AS housing_vacant_evolution_23_24,
        (d24.vacant_rate_2024 - d23.vacant_rate_2023) AS housing_vacant_rate_evolution_23_24,
        -- Évolution 2024-2025
        (d24.vacant_housing_2025 - d23.vacant_housing_2024) AS housing_vacant_evolution_24_25,
        (d24.vacant_rate_2025 - d23.vacant_rate_2024) AS housing_vacant_rate_evolution_24_25,
    FROM data_2025 d25
    LEFT JOIN data_2024 d24 ON d24.establishment_id = d25.establishment_id
    LEFT JOIN data_2019 d19 ON d24.establishment_id = d19.establishment_id
    LEFT JOIN data_2023 d23 ON d24.establishment_id = d23.establishment_id
),

-- Statistiques sur les évolutions
evolution_stats AS (
    SELECT
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY housing_vacant_evolution_19_24) AS median_evolution_19_24,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY housing_vacant_rate_evolution_19_24) AS median_rate_evolution_19_24,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY housing_vacant_evolution_23_24) AS median_evolution_23_24,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY housing_vacant_rate_evolution_23_24) AS median_rate_evolution_23_24,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY housing_vacant_evolution_19_24) AS q1_evolution_19_24,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY housing_vacant_evolution_19_24) AS q2_evolution_19_24,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY housing_vacant_evolution_19_24) AS q3_evolution_19_24,
        PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY housing_vacant_rate_evolution_19_24) AS q1_rate_evolution_19_24,
        PERCENTILE_CONT(0.50) WITHIN GROUP (ORDER BY housing_vacant_rate_evolution_19_24) AS q2_rate_evolution_19_24,
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY housing_vacant_rate_evolution_19_24) AS q3_rate_evolution_19_24

        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY housing_vacant_evolution_19_25) AS q3_rate_evolution_19_25
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY housing_vacant_rate_evolution_19_25) AS q3_rate_evolution_19_25
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY housing_vacant_evolution_24_25) AS q3_rate_evolution_24_25
        PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY housing_vacant_rate_evolution_24_25) AS q3_rate_evolution_24_25

    FROM evolution_data
),

-- Statistiques sur les évolutions par échelon
evolution_stats_by_echelon AS (
    SELECT
        e.establishment_echelon,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ed.housing_vacant_evolution_19_24) AS median_evolution_19_24_echelon,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ed.housing_vacant_rate_evolution_19_24) AS median_rate_evolution_19_24_echelon
    FROM evolution_data ed
    JOIN establishments e ON ed.establishment_id = e.establishment_id
    WHERE e.establishment_echelon IS NOT NULL
    GROUP BY e.establishment_echelon
)

-- Table finale avec tous les indicateurs
SELECT
    e.establishment_id,
    est.establishment_kind,
    est.establishment_echelon,
    e.year AS data_year,
    e.count_vacant_housing_private_fil_ccthp,
    e.housing_vacant_rate,
    
    -- Écarts par rapport aux médianes tous établissements
    (e.count_vacant_housing_private_fil_ccthp - g.median_vacant_housing) AS housing_vacant_compared_2024,
    (e.housing_vacant_rate - g.median_vacant_rate) AS housing_vacant_rate_compared_2024,
    
    -- Écarts par rapport aux médianes même échelon
    (e.count_vacant_housing_private_fil_ccthp - ech.median_vacant_housing_echelon) AS housing_vacant_compared_same_as_2024,
    (e.housing_vacant_rate - ech.median_vacant_rate_echelon) AS housing_vacant_rate_compared_same_as_2024,
    
    -- Typologie quartile pour le nombre de logements vacants
    CASE
        WHEN e.count_vacant_housing_private_fil_ccthp <= q.q1_vacant_housing THEN '0%-25% = Vacance relative très importante'
        WHEN e.count_vacant_housing_private_fil_ccthp <= q.q2_vacant_housing THEN '25%-50% = Vacance relative assez importante'
        WHEN e.count_vacant_housing_private_fil_ccthp <= q.q3_vacant_housing THEN '50%-75% = Vacance relative peu importante'
        ELSE '75%-100% = Vacance relative faible'
    END AS kind_housing_vacant_2024,
    
    -- Typologie quartile pour le même échelon
    CASE
        WHEN e.count_vacant_housing_private_fil_ccthp <= q.q1_vacant_housing THEN '0%-25% = Vacance relative très importante'
        WHEN e.count_vacant_housing_private_fil_ccthp <= q.q2_vacant_housing THEN '25%-50% = Vacance relative assez importante'
        WHEN e.count_vacant_housing_private_fil_ccthp <= q.q3_vacant_housing THEN '50%-75% = Vacance relative peu importante'
        ELSE '75%-100% = Vacance relative faible'
    END AS kind_housing_vacant_same_as_2024,
    
    -- Typologie quartile pour le taux de logements vacants
    CASE
        WHEN e.housing_vacant_rate <= q.q1_vacant_rate THEN '0%-25% = Taux de vacance relative très importante'
        WHEN e.housing_vacant_rate <= q.q2_vacant_rate THEN '25%-50% = Taux de vacance relative assez importante'
        WHEN e.housing_vacant_rate <= q.q3_vacant_rate THEN '50%-75% = Taux de vacance relative peu importante'
        ELSE '75%-100% = Taux de vacance relative faible'
    END AS kind_housing_vacant_rate_2024,
    
    -- Typologie quartile pour le taux de logements vacants même échelon
    CASE
        WHEN e.housing_vacant_rate <= q.q1_vacant_rate THEN '0%-25% = Taux de vacance relative très importante'
        WHEN e.housing_vacant_rate <= q.q2_vacant_rate THEN '25%-50% = Taux de vacance relative assez importante'
        WHEN e.housing_vacant_rate <= q.q3_vacant_rate THEN '50%-75% = Taux de vacance relative peu importante'
        ELSE '75%-100% = Taux de vacance relative faible'
    END AS kind_housing_vacant_rate_same_as_2024,
    
    -- Évolutions 2019-2024 et 2023-2024
    ed.housing_vacant_evolution_19_24,
    ed.housing_vacant_rate_evolution_19_24,
    ed.housing_vacant_evolution_23_24,
    ed.housing_vacant_rate_evolution_23_24,
    
    -- Écarts par rapport aux médianes d'évolution
    (ed.housing_vacant_evolution_19_24 - es.median_evolution_19_24) AS housing_vacant_evolution_compared_19_24,
    (ed.housing_vacant_rate_evolution_19_24 - es.median_rate_evolution_19_24) AS housing_vacant_rate_evolution_compared_19_24,
    
    -- Écarts par rapport aux médianes d'évolution même échelon
    (ed.housing_vacant_evolution_19_24 - ese.median_evolution_19_24_echelon) AS housing_vacant_evolution_compared_same_as_19_24,
    (ed.housing_vacant_rate_evolution_19_24 - ese.median_rate_evolution_19_24_echelon) AS housing_vacant_rate_evolution_compared_same_as_19_24,
    
    -- Typologie quartile pour l'évolution
    CASE
        WHEN ed.housing_vacant_evolution_19_24 <= es.q1_evolution_19_24 THEN '0%-25% = Évolution très négative'
        WHEN ed.housing_vacant_evolution_19_24 <= es.q2_evolution_19_24 THEN '25%-50% = Évolution assez négative'
        WHEN ed.housing_vacant_evolution_19_24 <= es.q3_evolution_19_24 THEN '50%-75% = Évolution assez positive'
        ELSE '75%-100% = Évolution très positive'
    END AS kind_housing_vacant_evolution_19_24,
    
    -- Typologie quartile pour l'évolution du taux
    CASE
        WHEN ed.housing_vacant_rate_evolution_19_24 <= es.q1_rate_evolution_19_24 THEN '0%-25% = Évolution très négative'
        WHEN ed.housing_vacant_rate_evolution_19_24 <= es.q2_rate_evolution_19_24 THEN '25%-50% = Évolution assez négative'
        WHEN ed.housing_vacant_rate_evolution_19_24 <= es.q3_rate_evolution_19_24 THEN '50%-75% = Évolution assez positive'
        ELSE '75%-100% = Évolution très positive'
    END AS kind_housing_vacant_rate_evolution_19_24,
    
    -- Typologie quartile pour l'évolution même échelon
    CASE
        WHEN ed.housing_vacant_evolution_19_24 <= es.q1_evolution_19_24 THEN '0%-25% = Évolution très négative'
        WHEN ed.housing_vacant_evolution_19_24 <= es.q2_evolution_19_24 THEN '25%-50% = Évolution assez négative'
        WHEN ed.housing_vacant_evolution_19_24 <= es.q3_evolution_19_24 THEN '50%-75% = Évolution assez positive'
        ELSE '75%-100% = Évolution très positive'
    END AS kind_housing_vacant_evolution_same_as_19_24,
    
    -- Typologie quartile pour l'évolution du taux même échelon
    CASE
        WHEN ed.housing_vacant_rate_evolution_19_24 <= es.q1_rate_evolution_19_24 THEN '0%-25% = Évolution très négative'
        WHEN ed.housing_vacant_rate_evolution_19_24 <= es.q2_rate_evolution_19_24 THEN '25%-50% = Évolution assez négative'
        WHEN ed.housing_vacant_rate_evolution_19_24 <= es.q3_rate_evolution_19_24 THEN '50%-75% = Évolution assez positive'
        ELSE '75%-100% = Évolution très positive'
    END AS kind_housing_vacant_rate_evolution_same_as_19_24

FROM establishment_yearly_data e
JOIN establishments est ON e.establishment_id = est.establishment_id
LEFT JOIN global_stats g ON e.year = g.year
LEFT JOIN echelon_stats ech ON e.year = ech.year AND e.establishment_echelon = ech.establishment_echelon
LEFT JOIN vacant_housing_quartiles q ON e.year = q.year
LEFT JOIN evolution_data ed ON e.establishment_id = ed.establishment_id
LEFT JOIN evolution_stats es ON 1=1
LEFT JOIN evolution_stats_by_echelon ese ON e.establishment_echelon = ese.establishment_echelon
WHERE e.year = 2024