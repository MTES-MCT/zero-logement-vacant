SELECT  geo_code , TRUE as is_in
FROM {{ ref('stg_common_article_232_2')}}
