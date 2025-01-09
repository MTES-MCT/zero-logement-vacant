SELECT rtrim(geo_code) AS geo_code, TRUE AS is_in
FROM {{ ref ('stg_common_article_232_2') }}
