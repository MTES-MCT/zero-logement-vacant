WITH ff_history AS (
    SELECT ff_idlocal, 'ff-' || ff_millesime AS file_year
    FROM {{ ref ('int_ff_ext_2024') }}
    UNION ALL
    SELECT ff_idlocal, 'ff-' || ff_millesime AS file_year
    FROM {{ ref ('int_ff_ext_2023') }}
    UNION ALL
    SELECT ff_idlocal, 'ff-' || ff_millesime AS file_year
    FROM {{ ref ('int_ff_ext_2022') }}
    UNION ALL
    SELECT ff_idlocal, 'ff-' || ff_millesime AS file_year
    FROM {{ ref ('int_ff_ext_2021') }}
    UNION ALL
    SELECT ff_idlocal, 'ff-' || ff_millesime AS file_year
    FROM {{ ref ('int_ff_ext_2020') }}
    UNION ALL
    SELECT ff_idlocal, 'ff-' || ff_millesime AS file_year
    FROM {{ ref ('int_ff_ext_2019') }}
)

SELECT
    ff_idlocal AS local_id,
    listagg(file_year, ',') AS file_years
FROM ff_history
GROUP BY local_id
