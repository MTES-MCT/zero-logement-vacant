WITH 
-- Définir les groupes de types pour chaque niveau
{% set niveau_1 = "'Commune'" %}
{% set niveau_2 = "'CA', 'CC', 'CU', 'EPCI', 'ME'" %}
{% set niveau_3 = "'SDED', 'DEP'" %}
{% set niveau_4 = "'REG', 'SDER'" %}

-- Toutes les relations possibles
all_relations AS (
    -- Niveau 1 -> Niveau 2 (profondeur 1)
    {{ generate_hierarchy_relations(niveau_1, niveau_2, 1) }}
    UNION ALL
    -- Niveau 1 -> Niveau 3 (profondeur 2)
    {{ generate_hierarchy_relations(niveau_1, niveau_3, 2) }}
    UNION ALL
    -- Niveau 1 -> Niveau 4 (profondeur 3)
    {{ generate_hierarchy_relations(niveau_1, niveau_4, 3) }}
    UNION ALL
    -- Niveau 2 -> Niveau 3 (profondeur 1)
    {{ generate_hierarchy_relations(niveau_2, niveau_3, 1) }}
    UNION ALL
    -- Niveau 2 -> Niveau 4 (profondeur 2)
    {{ generate_hierarchy_relations(niveau_2, niveau_4, 2) }}
    UNION ALL
    -- Niveau 3 -> Niveau 4 (profondeur 1)
    {{ generate_hierarchy_relations(niveau_3, niveau_4, 1) }}
)

-- Table finale de hiérarchie
SELECT DISTINCT
    ancestor_id,
    descendant_id,
    ancestor_type,
    descendant_type,
    depth
FROM all_relations