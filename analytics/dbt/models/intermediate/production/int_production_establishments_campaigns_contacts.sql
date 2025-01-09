WITH establishment_campaign_contacts AS (
    SELECT
        pe.id AS establishment_id,
        date_part('year', pc.sent_at) AS year,
        count(*) AS contacted_housing,
        count(DISTINCT pch.housing_id) AS contacts_number
    FROM {{ ref ('int_production_establishments') }} pe
    LEFT JOIN {{ ref ('int_production_campaigns') }} pc ON pc.establishment_id = pe.id
    LEFT JOIN {{ ref ('int_production_campaigns_housing') }} pch ON pc.id = pch.campaign_id
    WHERE pc.sent_at IS NOT NULL
    GROUP BY pe.id, year
),

establishment_followup AS (
    SELECT
        pe.id AS establishment_id,
        date_part('year', e.created_at) AS year,
        count(DISTINCT e.housing_id) AS contacted_housing_followup_ended,
        count(
            DISTINCT CASE
                WHEN new_sub_status = 'N''était pas vacant' THEN e.housing_id
            END
        ) AS contacted_housing_followup_ended_not_vacant

    FROM {{ ref ('int_production_establishments') }} pe
    LEFT JOIN {{ ref ('int_production_campaigns') }} pc ON pc.establishment_id = pe.id
    LEFT JOIN {{ ref ('int_production_campaigns_housing') }} pch ON pc.id = pch.campaign_id
    LEFT JOIN {{ ref ('int_production_events') }} e ON e.housing_id = pch.housing_id
    WHERE pc.sent_at IS NOT NULL
    AND event_status_label = 'Suivi terminé'
    AND user_source = 'user'
    GROUP BY pe.id, year
),

yearly_data AS (
    SELECT
        establishment_id,
        year,
        contacted_housing,
        contacts_number,
        contacted_housing_followup_ended,
        contacted_housing_followup_ended_not_vacant
    FROM establishment_campaign_contacts
    LEFT OUTER JOIN establishment_followup USING (establishment_id, year)
)

SELECT
    establishment_id,
    {{ pivot_columns_by_year (
    ["contacted_housing",
    "contacts_number",
    "contacted_housing_followup_ended",
    "contacted_housing_followup_ended_not_vacant"],
    [2020, 2021, 2022, 2023, 2024]
    ) }}
FROM yearly_data
GROUP BY establishment_id
ORDER BY establishment_id
