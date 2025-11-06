with source as (
    SELECT *
    FROM {{ source ('duckdb_raw', 'cerema_ff_2024_housing_raw') }}
),
cleaned_data as (
    select
        2024 as data_year,
        2024 as ff_millesime,
        idprocpte as owner_idprocpte,
        invar as invariant,
        idlocal as ff_idlocal,
        idbat as ff_idbat,
        idpar as ff_idpar,
        idsec as ff_idsec,
        dnvoiri as loc_num,
        ban_score as ban_result_score,
        CASE 
            WHEN ban_id IS NOT NULL THEN CONCAT(dvoilib, ' ', idcomtxt)
            ELSE NULL 
        END as ban_result_label,
        ban_id as ban_result_id,
        idcom,
        
        -- Extract latitude/longitude from ban_geom (assuming it's in WKT format)
        CASE 
            WHEN ban_geom IS NOT NULL THEN 
                TRY_CAST(REGEXP_EXTRACT(ban_geom, 'POINT\([^\s]+ ([^\)]+)\)') as DOUBLE)
            ELSE NULL 
        END as ban_latitude,
        CASE 
            WHEN ban_geom IS NOT NULL THEN 
                TRY_CAST(REGEXP_EXTRACT(ban_geom, 'POINT\(([^\s]+)') as DOUBLE)
            ELSE NULL 
        END as ban_longitude,
        
        -- Address construction
        REGEXP_REPLACE(
            TRIM(REGEXP_REPLACE(COALESCE(dvoilib, '') || ' ' || COALESCE(idcomtxt, ''), '^\s*0+', '')),
            ' {2,}',
            ' '
        ) as dgfip_address,
        CONCAT_WS(' ', LTRIM(TRIM(COALESCE(dvoilib, '')), '0'), TRIM(COALESCE(idcomtxt, ''))) as raw_address,
        
        -- Geo code construction
        LPAD(CAST(ccodep as VARCHAR), 2, '0') || LPAD(CAST(ccocom as VARCHAR), 3, '0') as geo_code,
        
        -- Extract coordinates from geomloc (assuming WKT format)
        CASE 
            WHEN geomloc IS NOT NULL THEN 
                TRY_CAST(REGEXP_EXTRACT(geomloc, 'POINT\([^\s]+ ([^\)]+)\)') as DOUBLE)
            ELSE NULL 
        END as y,
        CASE 
            WHEN geomloc IS NOT NULL THEN 
                TRY_CAST(REGEXP_EXTRACT(geomloc, 'POINT\(([^\s]+)') as DOUBLE)
            ELSE NULL 
        END as x,
        
        -- Assuming latitude/longitude are derived from coordinates (placeholder)
        NULL as latitude,
        NULL as longitude,
        
        catpro2 as dcapec2,
        dteloctxt as nature,
        npiece_p2 as ff_npiece_p2,
        dteloc as housing_kind,
        ctpdl as condominium,
        -- Uncomfortable calculation
        
        CASE
            WHEN jannath > 100 THEN COALESCE(jannath, 0)
            ELSE 0
        END as building_year,
        
        FLOOR(COALESCE(stoth, 0)) as living_area,
        CONCAT(ccosec, dnupla) as cadastral_reference, -- Reconstructed from section + plan
        
        TRY_STRPTIME(CAST(jdatat as VARCHAR), '%d%m%Y') as mutation_date,
        jdatat as ff_jdatat,
        jdatat as last_mutation_date, -- Same as jdatat for now
        -- dcntpa as plot_area,
        ndroit as beneficiary_count,
        CONCAT(
            COALESCE(LPAD(CAST(dnubat as VARCHAR), 2, '0'), ''),
            COALESCE(LPAD(CAST(descc as VARCHAR), 2, '0'), ''),
            COALESCE(LPAD(CAST(dniv as VARCHAR), 2, '0'), ''),
            COALESCE(LPAD(CAST(dpor as VARCHAR), 5, '0'), '')
        ) as batloc,
        
        dvltrt as vlcad,
        ctpdl as ff_ctpdl,
        ccthp as ff_ccthp,
        --dcapec2 as cadastral_classification,
        -- dtloc, -- rename dteloc
        TRY_CAST(dteloc as INTEGER) as dteloc,
        ctpdl,
        stoth,
        slocal,
        npiece_p2,
        jannath,
        -- dnbbai,
        -- dnbdou,
        -- dnbwc,
        dcapec2,
        ndroit,
        -- dcntpa,
        CASE
            WHEN TRIM(COALESCE(CAST(catpro2 as VARCHAR), '')) = '' THEN 'Particulier'
            ELSE 'Autre'
        END AS owner_kind, 
        locprop, 
        locproptxt, 
        logh  
    FROM source
)

SELECT * FROM cleaned_data
QUALIFY ROW_NUMBER() OVER (PARTITION BY ff_idlocal ORDER BY mutation_date DESC) = 1