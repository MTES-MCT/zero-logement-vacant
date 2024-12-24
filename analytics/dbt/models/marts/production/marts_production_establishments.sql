
{{
        config(
            materialized='table',
            unique_key='establishment_id',
        )
}}

SELECT 
    CAST(pe.id as VARCHAR) AS establishment_id,
    pe.*, peu.*, pec.*, peg.*, pep.*, pecc.*, pes.*
FROM {{ ref('int_production_establishments') }} pe 
LEFT JOIN {{ ref('int_production_establishments_users')}} peu ON pe.id = peu.establishment_id
LEFT JOIN {{ ref('int_production_establishments_campaigns')}} pec ON pe.id = pec.establishment_id
LEFT JOIN {{ ref('int_production_establishments_groups')}} peg ON pe.id = peg.establishment_id
LEFT JOIN {{ ref('int_production_establishments_perimeters')}} pep ON pe.id = pep.establishment_id
LEFT JOIN {{ ref('int_production_establishments_campaigns_contacts') }} pecc ON pe.id = pecc.establishment_id
LEFT JOIN {{ ref('int_production_establishment_events_last_status') }} pes ON pe.id = pes.establishment_id