{% macro filter_lovac(ccthp=False, vacancy=True) %}
        WHERE 
            1 = 1
            {% if ccthp %}
                AND ff_ccthp IN ('V')
            {% endif %}
            -- - 2 ans 
            {% if vacancy %}
                AND vacancy_start_year < data_year - 2
            {% endif %}
            AND (groupe NOT IN (1, 2, 3, 4, 5, 6, 9) OR groupe is NULL)
            AND aff = 'H'
            AND housing_kind IN ('APPART', 'MAISON')
            AND local_id IS NOT NULL
{% endmacro %}