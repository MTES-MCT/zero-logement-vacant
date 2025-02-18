{% macro generate_hierarchy_relations(source_type, target_type, depth) %}
(
    SELECT DISTINCT
        source.id as ancestor_id,
        target.id as descendant_id,
        source.kind as ancestor_type,
        target.kind as descendant_type,
        {{ depth }} as depth
    FROM {{ ref('int_production_establishments') }} source
    CROSS JOIN UNNEST(source.localities_geo_code) as s_geo_code
    JOIN {{ ref('int_production_establishments') }} target 
    CROSS JOIN UNNEST(target.localities_geo_code) as t_geo_code
        ON CAST(s_geo_code AS VARCHAR) = CAST(t_geo_code AS VARCHAR)
    WHERE source.kind = '{{ source_type }}'
    AND target.kind = '{{ target_type }}')
{% endmacro %}