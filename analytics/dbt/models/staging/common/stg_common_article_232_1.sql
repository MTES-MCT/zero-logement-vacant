SELECT  geo_code , TRUE as is_in
FROM {{ ref('article_232_1')}}
