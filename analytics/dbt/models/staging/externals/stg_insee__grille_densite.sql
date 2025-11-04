{{
    config(
        materialized='view',
        tags=['external', 'insee']
    )
}}

with source as (
    select * from {{ source('insee', 'grille_densite') }}
),

renamed as (
    select
        codgeo as code_commune,
        libgeo as nom_commune,
        niveau_densite,
        cast(niveau_densite as integer) as niveau_densite_int,
        case
            when niveau_densite = '1' then 'Commune densément peuplée'
            when niveau_densite = '2' then 'Commune de densité intermédiaire'
            when niveau_densite = '3' then 'Commune peu dense'
            when niveau_densite = '4' then 'Commune très peu dense'
            when niveau_densite = '5' then 'Commune rurale à habitat dispersé'
            when niveau_densite = '6' then 'Commune rurale à habitat très dispersé'
            when niveau_densite = '7' then 'Commune rurale inhabitée'
            else 'Inconnu'
        end as libelle_densite,
        current_timestamp as _loaded_at
    from source
)

select * from renamed


