SELECT * FROM {{ ref ('stg_lovac_2020') }}
{{ filter_lovac(ccthp = True, vacancy = False) }}
