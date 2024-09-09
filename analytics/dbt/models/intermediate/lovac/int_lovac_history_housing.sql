WITH lovac_history as (
                       SELECT local_id, 'lovac-' || data_year as file_year, geo_code, data_year,
                       FROM {{ ref('int_lovac_2024') }}
                       UNION ALL
                       SELECT local_id, 'lovac-' || data_year as file_year, geo_code, data_year,
                       FROM {{ ref('int_lovac_2023') }}
                       UNION ALL
                       SELECT local_id, 'lovac-' || data_year as file_year, geo_code, data_year,
                       FROM {{ ref('int_lovac_2022') }}
                       UNION ALL
                       SELECT local_id, 'lovac-' || data_year as file_year, geo_code, data_year,
                       FROM {{ ref('int_lovac_2021') }}
                       UNION ALL
                       SELECT local_id, 'lovac-' || data_year as file_year, geo_code, data_year,
                       FROM {{ ref('int_lovac_2020') }}
                       UNION ALL
                       SELECT local_id, 'lovac-' || data_year as file_year, geo_code, data_year,
                       FROM {{ ref('int_lovac_2019') }}
                       )

SELECT 
    local_id, 
    listagg(file_year, ',') as file_years,  
    (SELECT geo_code 
     FROM lovac_history lh2 
     WHERE lh2.local_id = lh.local_id 
     ORDER BY lh2.data_year DESC 
     LIMIT 1) AS geo_code
FROM lovac_history lh
GROUP BY local_id