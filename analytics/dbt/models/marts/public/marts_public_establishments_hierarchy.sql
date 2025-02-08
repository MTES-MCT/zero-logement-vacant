WITH 

-- Toutes les relations possibles
all_relations AS (
    -- Commune -> EPCI (profondeur 1)
    {{ generate_hierarchy_relations('Commune', 'CA', 1) }}
    UNION ALL
    {{ generate_hierarchy_relations('Commune', 'CC', 1) }}
    UNION ALL
    -- Commune -> Département (profondeur 2)
    {{ generate_hierarchy_relations('Commune', 'DEP', 2) }}
    UNION ALL
    -- Commune -> Région (profondeur 3)
    {{ generate_hierarchy_relations('Commune', 'REG', 3) }}
    UNION ALL
    -- EPCI -> Département (profondeur 1)
    {{ generate_hierarchy_relations('CA', 'DEP', 1) }}
    UNION ALL
    {{ generate_hierarchy_relations('CC', 'DEP', 1) }}
    UNION ALL
    -- EPCI -> Région (profondeur 2)
    {{ generate_hierarchy_relations('CA', 'REG', 2) }}
    UNION ALL
    {{ generate_hierarchy_relations('CC', 'REG', 2) }}
    UNION ALL
    -- Département -> Région (profondeur 1)
    {{ generate_hierarchy_relations('DEP', 'REG', 1) }}
)

SELECT DISTINCT
    ancestor_id,
    descendant_id,
    ancestor_type,
    descendant_type,
    depth
FROM all_relations