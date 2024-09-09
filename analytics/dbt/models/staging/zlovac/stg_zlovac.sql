with source as (
    SELECT * FROM {{ source('duckdb_raw', 'raw_lovac') }}
),
cleaned_data AS (
 SELECT
		annee as data_year,
		ff_millesime,
        invariant,
        ff_idlocal AS local_id,
        ff_idbat AS building_id,
		ff_idpar AS plot_id,
		ff_idsec AS section_id,
        loc_num AS loc_num, -- TODO: Concatener loc_num + loc_voie + libvoie + libcom
		ban_result_score,
		ban_result_label,
		ban_postcode,
		ban_result_id,
        ff_idcom AS ff_idcom,
		TRY_CAST(ban_latitude as DOUBLE) AS ban_latitude,
		TRY_CAST(ban_longitude as DOUBLE) AS ban_longitude,
        REGEXP_REPLACE(trim(REGEXP_REPLACE(libvoie || ' ' || libcom,'^\s*0+', '')), ' {2,}', ' ') as dgfip_address,
        CONCAT_WS(ltrim(trim(libvoie), '0'), trim(libcom)) AS raw_address,
        lpad(ccodep, 2, '0') || lpad(commune, 3, '0') AS geo_code,  
		TRY_CAST(ff_y AS DOUBLE) AS y,
        TRY_CAST(ff_x AS DOUBLE) AS x,
        TRY_CAST(ff_y_4326 AS DOUBLE) AS latitude,
        TRY_CAST(ff_x_4326 AS DOUBLE) AS longitude,
        ff_dcapec2 AS cadastral_classification,
        
        nature AS housing_kind,
        ff_npiece_p2 AS rooms_count,
        COALESCE(ff_dcapec2) > 6 
        OR
        COALESCE(ff_dnbwc) = 0
        OR
        (
            (COALESCE(ff_dnbbai, 0) + COALESCE(ff_dnbdou, 0)) = 0
        ) AS uncomfortable,
        CASE
            WHEN ff_jannath > 100 THEN COALESCE(ff_jannath, 0)
            ELSE 0
        END AS building_year,
        FLOOR(ff_stoth) AS living_area,
        refcad AS cadastral_reference,
        try_strptime(anmutation, '{{ var("dateFormat") }}') AS mutation_date,
		ff_jdatat,
		ffh_jdatat,
        CASE
            WHEN potentiel_tlv_thlv = '*' THEN TRUE
            ELSE FALSE
        END AS taxed,
        ff_ndroit AS beneficiary_count,
        batloc AS building_location,
        vlcad AS rental_value,
        ff_ctpdl AS ownership_kind,
        ff_ccthp AS ff_ccthp,
        TRY_CAST(groupe AS INTEGER) as groupe,
        debutvacance AS vacancy_start_year,
        aff as aff,
        CAST(vl_revpro AS INTEGER) as vl_revpro,
        potentiel_tlv_thlv, 
        ff_geomloc,
		-- DVF
		dvf_datemut,
		dvf_nblocmut,
		dvf_nblog,
		dvf_valeurfonc,
		dvf_idmutation,
		dvf_libnatmut,
		dvf_vefa,
		dvf_codtypbien,
		dvf_libtypbien,
		dvf_filtre,
		dvf_codtypprov,
		dvf_codtypproa,
		-- Owner
        CASE 
            WHEN TRIM(proprietaire) <> '' THEN REGEXP_REPLACE(TRIM(CAST(proprietaire AS VARCHAR)), '-', ' ')
            ELSE REGEXP_REPLACE(TRIM(gestre_ppre), '-', ' ')
        END AS owner_fullname,
        CASE WHEN TRIM(proprietaire) <> '' THEN TRIM(gestre_ppre) END AS administrator,
        CONCAT_WS(NULLIF(TRIM(adresse1), ''), NULLIF(TRIM(adresse2), ''), NULLIF(TRIM(adresse3), ''), NULLIF(TRIM(adresse4), '')) AS owner_raw_address,
		adresse1 as owner_adresse1,
		adresse2 as owner_adresse2,
		adresse3 as owner_adresse3,
		adresse4 as owner_adresse4,
		NULLIF(TRIM(adresse4), '') as owner_city,
        REGEXP_EXTRACT(adresse4, '\d{5}') AS owner_postal_code,
		-- FF owners
        cer_ff_adresse_1 as ff_owner_1_raw_address,
		cer_ff_adresse_2 as ff_owner_2_raw_address,
		cer_ff_adresse_3 as ff_owner_3_raw_address,
		cer_ff_adresse_4 as ff_owner_4_raw_address,
		cer_ff_adresse_5 as ff_owner_5_raw_address,
		cer_ff_adresse_6 as ff_owner_6_raw_address,
        REGEXP_EXTRACT(cer_ff_adresse_1, '\d{5}') AS ff_owner_1_postal_code,
        REGEXP_EXTRACT(cer_ff_adresse_2, '\d{5}') AS ff_owner_2_postal_code,
        REGEXP_EXTRACT(cer_ff_adresse_3, '\d{5}') AS ff_owner_3_postal_code,
        REGEXP_EXTRACT(cer_ff_adresse_4, '\d{5}') AS ff_owner_4_postal_code,
        REGEXP_EXTRACT(cer_ff_adresse_5, '\d{5}') AS ff_owner_5_postal_code,
        REGEXP_EXTRACT(cer_ff_adresse_6, '\d{5}') AS ff_owner_6_postal_code,
		-- nullif(trim(ff_dlign6_1), '') as ff_owner_1_city,
		-- nullif(trim(ff_dlign6_2), '') as ff_owner_2_city,
		-- nullif(trim(ff_dlign6_3), '') as ff_owner_3_city,
		-- nullif(trim(ff_dlign6_4), '') as ff_owner_4_city,
		-- nullif(trim(ff_dlign6_5), '') as ff_owner_5_city,
		-- nullif(trim(ff_dlign6_6), '') as ff_owner_6_city,
		ff_idprodroit_1 as ff_owner_1_idprodroit,
		ff_idprodroit_2 as ff_owner_2_idprodroit,
		ff_idprodroit_3 as ff_owner_3_idprodroit,
		ff_idprodroit_4 as ff_owner_4_idprodroit,
		ff_idprodroit_5 as ff_owner_5_idprodroit,
		ff_idprodroit_6 as ff_owner_6_idprodroit,
        ff_locprop_1 as ff_owner_1_locprop,
        ff_locprop_2 as ff_owner_2_locprop,
        ff_locprop_3 as ff_owner_3_locprop,
        ff_locprop_4 as ff_owner_4_locprop,
        ff_locprop_5 as ff_owner_5_locprop,
        ff_locprop_6 as ff_owner_6_locprop,
        upper(ff_ddenom_1) as ff_owner_1_fullname,
        upper(ff_ddenom_2) as ff_owner_2_fullname,
        upper(ff_ddenom_3) as ff_owner_3_fullname,
        upper(ff_ddenom_4) as ff_owner_4_fullname,
        upper(ff_ddenom_5) as ff_owner_5_fullname,
        upper(ff_ddenom_6) as ff_owner_6_fullname,
        try_strptime(CAST(ff_jdatnss_1 AS VARCHAR), '{{ var("dateFormat") }}') AS ff_owner_1_birth_date,
        try_strptime(CAST(ff_jdatnss_2 AS VARCHAR), '{{ var("dateFormat") }}') AS ff_owner_2_birth_date,
        try_strptime(CAST(ff_jdatnss_3 AS VARCHAR), '{{ var("dateFormat") }}') AS ff_owner_3_birth_date,
        try_strptime(CAST(ff_jdatnss_4 AS VARCHAR), '{{ var("dateFormat") }}') AS ff_owner_4_birth_date,
        try_strptime(CAST(ff_jdatnss_5 AS VARCHAR), '{{ var("dateFormat") }}') AS ff_owner_5_birth_date,
        try_strptime(CAST(ff_jdatnss_6 AS VARCHAR), '{{ var("dateFormat") }}') AS ff_owner_6_birth_date,
		ff_catpro2txt_1 as ff_owner_1_kind,
		ff_catpro2txt_2 as ff_owner_2_kind,
		ff_catpro2txt_3 as ff_owner_3_kind,
		ff_catpro2txt_4 as ff_owner_4_kind,
		ff_catpro2txt_5 as ff_owner_5_kind,
		ff_catpro2txt_6 as ff_owner_6_kind,
        {{process_owner_kind('ff_catpro3_1')}} AS ff_owner_1_kind_detail,
		{{process_owner_kind('ff_catpro3_2')}} AS ff_owner_2_kind_detail,
        {{process_owner_kind('ff_catpro3_3')}} AS ff_owner_3_kind_detail,
        {{process_owner_kind('ff_catpro3_4')}} AS ff_owner_4_kind_detail,
        {{process_owner_kind('ff_catpro3_5')}} AS ff_owner_5_kind_detail,
        {{process_owner_kind('ff_catpro3_6')}} AS ff_owner_6_kind_detail,
		{{process_owner_code_droit('ff_ccodro_1')}} as ff_owner_1_code_droit,
		{{process_owner_code_droit('ff_ccodro_2')}} as ff_owner_2_code_droit,
		{{process_owner_code_droit('ff_ccodro_3')}} as ff_owner_3_code_droit,
		{{process_owner_code_droit('ff_ccodro_4')}} as ff_owner_4_code_droit,
		{{process_owner_code_droit('ff_ccodro_5')}} as ff_owner_5_code_droit,
		{{process_owner_code_droit('ff_ccodro_6')}} as ff_owner_6_code_droit,
        CASE
            WHEN TRIM(groupe::TEXT) = '' THEN 'Particulier'
            ELSE 'Autre'
        END AS owner_kind
    FROM
        source
)

SELECT * FROM cleaned_data
QUALIFY 
    ROW_NUMBER() OVER (PARTITION BY local_id ORDER BY mutation_date DESC) = 1
-- LIMIT 10000

