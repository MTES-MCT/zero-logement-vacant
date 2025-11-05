{{
    config(
        materialized='view',
        tags=['external', 'urssaf']
    )
}}

with source as (
    select * from {{ source('urssaf', 'etablissements_effectifs') }}
),

renamed as (
    select
        code_commune,
        cast(annee as integer) as annee,
        ape as code_ape,
        cast(nb_etablissements as integer) as nb_etablissements,
        cast(effectifs as integer) as effectifs,
        current_timestamp as _loaded_at
    from source
)

select * from renamed


