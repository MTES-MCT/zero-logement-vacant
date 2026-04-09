SELECT * FROM {{ ref ('stg_lovac_2026') }}
{{ filter_lovac(ccthp = False, vacancy = False) }}
{{ deduplicate_lovac() }}
