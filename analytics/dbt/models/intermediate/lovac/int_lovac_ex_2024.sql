SELECT * FROM {{ ref('stg_lovac_2024') }}
{{ filter_lovac(ccthp=False, vacancy=False) }}