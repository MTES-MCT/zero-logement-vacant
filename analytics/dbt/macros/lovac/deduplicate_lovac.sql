{% macro deduplicate_lovac() %}
QUALIFY
ROW_NUMBER () OVER (PARTITION BY local_id ORDER BY debutvacance DESC) = 1
{% endmacro %}