WITH campaigns AS (
    SELECT * FROM {{ ref('int_production_campaigns') }}
), months AS (
    SELECT date_month as month FROM {{ ref('int_common_spine_months') }}
), campaigns_events AS (
    SELECT 
        DATE_TRUNC('month', created_at) AS month,
        COUNT(*) AS total_created,
        SUM(CASE WHEN validated_at IS NOT NULL THEN 1 ELSE 0 END ) AS total_validated,
        SUM(CASE WHEN confirmed_at IS NOT NULL THEN 1 ELSE 0 END ) AS total_confirmed,
        SUM(CASE WHEN sent_at IS NOT NULL THEN 1 ELSE 0 END ) AS total_sent
    FROM campaigns
    GROUP BY month
), monthly_campaigns AS (
SELECT 
    m.month,
    COALESCE(SUM(c.total_created), 0) AS total_campaigns_created,
    COALESCE(SUM(c.total_validated), 0) AS total_campaigns_validated,
    COALESCE(SUM(c.total_confirmed), 0) AS total_campaigns_confirmed,
    COALESCE(SUM(c.total_sent), 0) AS total_campaigns_sent,
FROM 
   months m
LEFT JOIN 
    campaigns_events c 
ON 
    m.month = c.month
GROUP BY 
    m.month
ORDER BY 
    m.month
)
SELECT c.*,
    SUM(total_campaigns_validated) OVER (ORDER BY c.month) AS cumulative_campaigns_validated,
    SUM(total_campaigns_created) OVER (ORDER BY c.month) AS cumulative_campaigns_created,
    SUM(total_campaigns_confirmed) OVER (ORDER BY c.month) AS cumulative_campaigns_confirmed,
    SUM(total_campaigns_sent) OVER (ORDER BY c.month) AS cumulative_campaigns_sent
 FROM monthly_campaigns c