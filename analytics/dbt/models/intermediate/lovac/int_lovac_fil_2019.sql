SELECT * FROM {{ ref ('stg_lovac_2019') }}
{{ filter_lovac(ccthp = True) }}
{{ deduplicate_lovac() }}