SELECT * FROM {{ ref('stg_lovac_2019') }}
{{ filter_lovac() }}
