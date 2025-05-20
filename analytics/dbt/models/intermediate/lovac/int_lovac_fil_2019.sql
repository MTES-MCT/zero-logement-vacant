WITH tmp_lovac AS (
    SELECT * FROM {{ ref ('stg_lovac_2019') }}
    {{ deduplicate_lovac() }}
)
SELECT * FROM tmp_lovac
{{ filter_lovac(ccthp = True) }}