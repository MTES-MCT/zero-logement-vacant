SELECT DISTINCT ON(insee_code) *,
    insee_code AS geo_code
FROM {{ ref('stg_common_cities')}}
