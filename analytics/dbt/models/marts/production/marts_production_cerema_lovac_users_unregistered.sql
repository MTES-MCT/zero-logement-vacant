{{ config(materialized='table') }}

with unregistered as (
    select *
    from {{ ref('stg_external_cerema_lovac_users') }}
    where email not in (
        select email
        from {{ ref('int_production_users') }}
        where email is not null
    )
      and structure_acces_lovac is not null
)

-- A user (email) can be attached to several Portail DF structures, which yields
-- several source rows. Keep one row per user to contact, favouring the structure
-- with the most recent LOVAC access.
select *
from unregistered
qualify row_number() over (
    partition by email
    order by structure_acces_lovac desc, structure_siret
) = 1
