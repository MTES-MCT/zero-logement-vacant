SELECT * FROM {{ ref('stg_lovac_2023') }}
{{ filter_lovac(ccthp=True) }}