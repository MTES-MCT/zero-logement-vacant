{{ config(materialized='table') }}

select *
from {{ ref('stg_external_cerema_lovac_users') }}
where email not in (
    select email
    from {{ ref('int_production_users') }}
    where email is not null
)
  and structure_acces_lovac is not null
