WITH ff_data AS (
    SELECT
        ff_idlocal,
        ff_ccthp AS occupancy
    FROM {{ ref ('int_ff_ext_2023') }}
),

lovac_2024 AS (
    SELECT
        ff_idlocal
    FROM {{ ref ('int_lovac_fil_2024') }}
),

lovac_2023 AS (
    SELECT
        ff_idlocal
    FROM {{ ref ('int_lovac_fil_2023') }}
),

lovac_history AS (
    SELECT * FROM {{ ref ('int_lovac_history_housing') }}
)

SELECT
    COALESCE(l24.ff_idlocal, l23.ff_idlocal, fd.ff_idlocal) AS local_id,
    CASE
        -- Si présent dans LOVAC 2024, absent de LOVAC 2023 et loué dans FF 2023
        WHEN
            l24.ff_idlocal IS NOT NULL
            AND l23.ff_idlocal IS NULL
            AND fd.occupancy = 'L' THEN 'lovac-2024,ff-23'

        -- Si présent uniquement dans LOVAC 2024
        WHEN l24.ff_idlocal IS NOT NULL THEN 'lovac-2024'

        -- Si présent uniquement dans LOVAC 2023
        WHEN l23.ff_idlocal IS NOT NULL THEN 'lovac-2023'

        -- Si loué dans FF 2023
        WHEN fd.occupancy = 'L' THEN 'ff-2023-locatif'

        ELSE NULL
    END AS data_file_years
FROM ff_data fd
FULL OUTER JOIN lovac_2024 l24 ON fd.ff_idlocal = l24.ff_idlocal
FULL OUTER JOIN
    lovac_2023 l23
    ON COALESCE(fd.ff_idlocal, l24.ff_idlocal) = l23.ff_idlocal
WHERE fd.occupancy = 'L'
