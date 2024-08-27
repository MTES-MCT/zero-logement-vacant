SELECT DISTINCT ON(insee_code) * 
FROM {{ ref('cities')}}
