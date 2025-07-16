{% macro process_owner_property_rights_light (ccordro_field) %}
CASE
WHEN {{ ccordro_field }} = 'P' THEN 'Plein Propriétaire'
WHEN {{ ccordro_field }} = 'U' THEN 'Usufruitier'
WHEN {{ ccordro_field }} = 'N' THEN 'Nu-propriétaire'
WHEN {{ ccordro_field }} IN ('R', 'F', 'T', 'D', 'V', 'W', 'A', 'E', 'K', 'L', 'O', 'J', 'Q', 'X', 'Y', 'C', 'M', 'Z', 'B') THEN 'Autre'
WHEN {{ ccordro_field }} = 'G' THEN 'Administrateur'
WHEN {{ ccordro_field }} = 'S' THEN 'Syndic de copropriété'
WHEN {{ ccordro_field }} = 'H' THEN 'Associé SCI IR'
ELSE 'Non classifié'
END
{% endmacro %}