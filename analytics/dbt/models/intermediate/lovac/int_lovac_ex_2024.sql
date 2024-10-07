SELECT * FROM {{ ref('stg_lovac_2024') }}
{{ filter_lovac(vacancy=False) }}