{% macro pivot_columns_by_year (columns, years) %}
{% for column in columns %}
{% for year in years %}
SUM (CASE WHEN year = {{ year }} THEN {{ column }} END) AS {{ column }}_{{ year }} {% if not loop.last %},
{% endif %}
{% endfor %}
{% if not loop.last %}, {% endif %}
{% endfor %}
{% endmacro %}
