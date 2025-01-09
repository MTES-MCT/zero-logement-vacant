{{ dbt_utils.date_spine (
datepart = "month",
start_date = "cast('2020-01-01' as date)",
end_date = "cast(CURRENT_DATE + INTERVAL '1 month' - INTERVAL '1 day' as date)",
) }}
