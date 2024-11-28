SELECT * FROM {{ ref('stg_lovac_2024') }}
{{ filter_lovac(ccthp=True, vacancy=False) }}