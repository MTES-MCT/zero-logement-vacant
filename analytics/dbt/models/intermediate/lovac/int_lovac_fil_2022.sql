SELECT * FROM {{ ref('stg_lovac_2022') }}
{{ filter_lovac(ccthp=True) }}