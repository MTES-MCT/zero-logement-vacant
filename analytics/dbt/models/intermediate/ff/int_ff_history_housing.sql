WITH ff_history as (
                       SELECT ff_idlocal, 'ff-' || ff_millesime as file_year, 
                       FROM {{ ref('int_ff_ext_2023') }}
                       UNION ALL
                       SELECT ff_idlocal, 'ff-' || ff_millesime as file_year, 
                       FROM {{ ref('int_ff_ext_2022') }}
                       UNION ALL
                       SELECT ff_idlocal, 'ff-' || ff_millesime as file_year,
                       FROM {{ ref('int_ff_ext_2021') }}
                       UNION ALL
                       SELECT ff_idlocal, 'ff-' || ff_millesime as file_year,
                       FROM {{ ref('int_ff_ext_2020') }}
                       UNION ALL
                       SELECT ff_idlocal, 'ff-' || ff_millesime as file_year,
                       FROM {{ ref('int_ff_ext_2019') }})
SELECT 
    ff_idlocal as local_id, 
    listagg(file_year, ',') as file_years, 
FROM ff_history lh
GROUP BY local_id