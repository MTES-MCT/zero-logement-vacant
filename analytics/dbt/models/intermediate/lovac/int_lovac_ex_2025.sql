SELECT * FROM {{ ref ('stg_lovac_2025') }}
{{ filter_lovac(ccthp = False, vacancy = False) }}
{{ deduplicate_lovac() }}