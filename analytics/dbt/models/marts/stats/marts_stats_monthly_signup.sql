WITH months AS (
    SELECT date_month AS month FROM {{ ref ('int_common_spine_months') }}
),

establishment_data AS (
    SELECT
        DATE_TRUNC('month', first_activated_at) AS month,
        COUNT(*) AS created_establishments,
        SUM(user_number) AS created_establishments_accounts
    FROM
    {{ ref ('marts_production_establishments') }}
    WHERE
    user_number > 0
    GROUP BY
    month
),

users_data AS (
    SELECT
        DATE_TRUNC('month', activated_at) AS month,
        COUNT(*) AS created_users
    FROM
    {{ ref ('marts_production_users') }}
    GROUP BY
    month
)

SELECT
    m.month,
    COALESCE(ed.created_establishments, 0) AS created_establishments,
    SUM(COALESCE(ed.created_establishments, 0))
        OVER (ORDER BY m.month)
        AS cumulative_created_establishments,
    COALESCE(ed.created_establishments_accounts, 0)
        AS created_establishments_accounts,
    SUM(COALESCE(ed.created_establishments_accounts, 0))
        OVER (ORDER BY m.month)
        AS cumulative_created_establishments_accounts,
    COALESCE(ud.created_users, 0) AS created_users,
    SUM(COALESCE(ud.created_users, 0))
        OVER (ORDER BY m.month)
        AS cumulative_created_users
FROM
    months m
LEFT JOIN
    establishment_data ed
    ON
        m.month = ed.month
LEFT JOIN
    users_data ud
    ON
        m.month = ud.month
