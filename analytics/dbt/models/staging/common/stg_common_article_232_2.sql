SELECT geo_code, TRUE AS is_in
FROM {{ ref ('article_232_2') }}
