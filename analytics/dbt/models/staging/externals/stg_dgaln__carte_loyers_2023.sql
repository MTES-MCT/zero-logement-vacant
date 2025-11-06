{{
    config(
        materialized='view',
        tags=['external', 'dgaln']
    )
}}

with source as (
    select * from {{ source('dgaln', 'carte_loyers_2023') }}
),

renamed as (
    select
        -- Assuming columns from the parquet file
        -- You'll need to adjust these based on actual schema
        code_commune,
        nom_commune,
        loyer_median,
        loyer_moyen,
        nb_annonces,
        -- Add other relevant columns
        current_timestamp as _loaded_at
    from source
)

select * from renamed


