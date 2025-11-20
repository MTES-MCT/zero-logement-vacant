{% test same_row_number(model, table_one, table_two) %}
SELECT *
FROM (
    SELECT
        CASE
            WHEN (SELECT COUNT(*) FROM {{ ref(table_one) }}) = (SELECT COUNT(*) FROM {{ ref(table_two) }})
            THEN 0
            ELSE 1
        END AS row_count_mismatch
) AS check_result
WHERE row_count_mismatch = 1
{% endtest %}
