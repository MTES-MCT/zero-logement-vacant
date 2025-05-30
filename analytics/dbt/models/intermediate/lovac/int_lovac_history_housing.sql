WITH lovac_history AS (
    SELECT local_id, 'lovac-' || data_year AS file_year, geo_code, data_year
    FROM {{ ref ('int_lovac_fil_2025') }}
    UNION ALL
    SELECT local_id, 'lovac-' || data_year AS file_year, geo_code, data_year
    FROM {{ ref ('int_lovac_fil_2024') }}
    UNION ALL
    SELECT local_id, 'lovac-' || data_year AS file_year, geo_code, data_year
    FROM {{ ref ('int_lovac_fil_2023') }}
    UNION ALL
    SELECT local_id, 'lovac-' || data_year AS file_year, geo_code, data_year
    FROM {{ ref ('int_lovac_fil_2022') }}
    UNION ALL
    SELECT local_id, 'lovac-' || data_year AS file_year, geo_code, data_year
    FROM {{ ref ('int_lovac_fil_2021') }}
    UNION ALL
    SELECT local_id, 'lovac-' || data_year AS file_year, geo_code, data_year
    FROM {{ ref ('int_lovac_fil_2020') }}
    UNION ALL
    SELECT local_id, 'lovac-' || data_year AS file_year, geo_code, data_year
    FROM {{ ref ('int_lovac_fil_2019') }}
)

SELECT
    local_id,
    listagg(file_year, ',') AS file_years,
    (
        SELECT geo_code
        FROM lovac_history lh2
        WHERE lh2.local_id = lh.local_id
        ORDER BY lh2.data_year DESC
        LIMIT 1
    ) AS geo_code
FROM lovac_history lh
GROUP BY local_id
