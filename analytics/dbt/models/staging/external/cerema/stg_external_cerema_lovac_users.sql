{{ config(materialized='view') }}

with source as (
    select * from {{ source('external_cerema', 'cerema_lovac_users_raw') }}
),

renamed as (
    select
        email,
        id_user,
        exterieur,
        gestionnaire,
        cast(date_rattachement as date) as date_rattachement,
        cast(date_expiration as date) as date_expiration,
        cgu_valide,
        structure_id,
        structure_raison_sociale,
        structure_siret,
        structure_niveau_acces,
        cast(structure_acces_lovac as date) as structure_acces_lovac,
        current_timestamp as _loaded_at
    from source
)

select * from renamed
