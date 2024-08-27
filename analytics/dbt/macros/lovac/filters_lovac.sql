{% macro filter_lovac() %}
        WHERE
            ff_ccthp IN ('V')
            -- - 2 ans 
            AND vacancy_start_year < data_year - 2
            AND (groupe NOT IN (1, 2, 3, 4, 5, 6, 9) OR groupe is NULL)
            AND aff = 'H'
            AND housing_kind IN ('APPART', 'MAISON')
            AND local_id IS NOT NULL
{% endmacro %}