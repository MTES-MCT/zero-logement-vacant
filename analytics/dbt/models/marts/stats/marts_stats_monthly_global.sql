WITH campains_monthly_stats AS (
    SELECT * FROM {{ ref('marts_stats_monthly_campains')}}
), signup_monthlys_stats  AS (
    SELECT * FROM {{ ref('marts_stats_monthly_signup')}}
)
SELECT campains_monthly_stats.*, 
        signup_monthlys_stats.*,
FROM campains_monthly_stats
    LEFT OUTER JOIN signup_monthlys_stats ON campains_monthly_stats.month = signup_monthlys_stats.month