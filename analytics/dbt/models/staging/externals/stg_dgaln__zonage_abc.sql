{{
    config(
        materialized='view',
        tags=['external', 'dgaln']
    )
}}

with source as (
    select * from {{ source('dgaln', 'zonage_abc') }}
),

renamed as (
    select
        -- Adjust columns based on actual schema
        code_commune,
        nom_commune,
        zone,  -- A, B1, B2, or C
        -- Add other relevant columns
        current_timestamp as _loaded_at
    from source
)

select * from renamed


