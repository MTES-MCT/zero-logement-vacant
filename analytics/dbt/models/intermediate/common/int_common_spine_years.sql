{{ dbt_utils.date_spine(
    datepart="year", 
    start_date="cast('2020-01-01' as date)", 
    end_date="CURRENT_DATE"
) }}