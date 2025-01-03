{% test same_row_number(table_one, table_two) %}
SELECT 
    CASE 
        WHEN (SELECT COUNT(*) FROM {{ ref(table_one) }}) = 
             (SELECT COUNT(*) FROM {{ ref(table_two) }}) 
        THEN 0 
        ELSE 1 
    END AS row_count_mismatch
{% endtest %}
