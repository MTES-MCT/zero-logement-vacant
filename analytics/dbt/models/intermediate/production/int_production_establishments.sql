

SELECT est.*,
    CASE 
        WHEN est.kind = 'CA' THEN 'Communauté d''Agglomération'
        WHEN est.kind = 'CC' THEN 'Communauté des Communes'
        WHEN est.kind = 'CU' THEN 'Communauté Urbaine'
        WHEN est.kind = 'Commune' THEN 'Commune'
        WHEN est.kind = 'ME' THEN 'Métropole'
        WHEN est.kind = 'DEP' THEN 'Département'
        WHEN est.kind = 'PETR' THEN 'Pôle Équilibre Territorial'
        WHEN est.kind = 'REG' THEN 'Région'
        WHEN est.kind = 'SDED' THEN 'Service Déconcentré Départemental'
        WHEN est.kind = 'SDER' THEN 'Service Déconcentré Régional'
        WHEN est.kind = 'ASSO' THEN 'Association'
        ELSE 'Autre'
    END AS establishment_kind_label,
    CASE 
        WHEN est.kind IN ('CA', 'CC', 'CU', 'ME') THEN 'Intercommunalité'
        WHEN est.kind = 'Commune' THEN 'Commune'
        WHEN est.kind = 'DEP' THEN 'Autre'
        WHEN est.kind = 'PETR' THEN 'Autre'
        WHEN est.kind = 'REG' THEN 'Autre'
        WHEN est.kind = 'SDED' THEN 'DDT/M'
        WHEN est.kind = 'SDER' THEN 'Autre'
        WHEN est.kind = 'ASSO' THEN 'Autre'
        ELSE 'Autre'
    END AS establishment_synthetic_type_label,
    CASE 
        WHEN est.kind IN ('SDED', 'SDER') THEN TRUE
        ELSE FALSE
    END AS covered_by_state_service,
    
FROM {{ ref('stg_production_establishments') }} est