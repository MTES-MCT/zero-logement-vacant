SELECT * FROM {{ ref ('stg_lovac_2025') }}
{{ filter_lovac(ccthp = False) }}
{{ deduplicate_lovac() }}