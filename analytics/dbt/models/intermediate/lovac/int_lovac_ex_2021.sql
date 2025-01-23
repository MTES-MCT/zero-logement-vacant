SELECT * FROM {{ ref ('stg_lovac_2021') }}
{{ filter_lovac(ccthp = True, vacancy = False) }}
{{ deduplicate_lovac() }}