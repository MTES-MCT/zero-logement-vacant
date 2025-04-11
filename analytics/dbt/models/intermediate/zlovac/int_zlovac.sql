FROM {{ ref ("int_lovac_fil_2025") }}
SELECT 
        annee as data_year,
        ff_millesime,
        invariant,
        ff_idlocal as local_id,
        ff_idbat as building_id,
        ff_idpar as plot_id,
        ff_idsec as section_id,
        loc_num, -- TODO: Concatener loc_num + loc_voie + libvoie + libcom
        ban_result_score,
        ban_result_label,
        ban_result_id,
        idcom,
        TRY_CAST(ban_latitude as DOUBLE) as ban_latitude,
        TRY_CAST(ban_longitude as DOUBLE) as ban_longitude,
        REGEXP_REPLACE(
            TRIM(REGEXP_REPLACE(libvoie || ' ' || libcom, '^\s*0+', '')),
            ' {2,}',
            ' '
        ) as dgfip_address,
        CONCAT_WS(LTRIM(TRIM(libvoie), '0'), TRIM(libcom)) as raw_address,
        LPAD(ccodep, 2, '0') || LPAD(commune, 3, '0') as geo_code,
        TRY_CAST(ff_y as DOUBLE) as y,
        TRY_CAST(ff_x as DOUBLE) as x,
        TRY_CAST(ff_y_4326 as DOUBLE) as latitude,
        TRY_CAST(ff_x_4326 as DOUBLE) as longitude,
        ff_dcapec2 as cadastral_classification,

        nature as housing_kind,
        ff_npiece_p2 as rooms_count,
        COALESCE(ff_dcapec2) > 6
        or
        COALESCE(ff_dnbwc) = 0
        or
        (
            (COALESCE(ff_dnbbai, 0) + COALESCE(ff_dnbdou, 0)) = 0
        ) as uncomfortable,
        case
            when ff_jannath > 100 then COALESCE(ff_jannath, 0)
            else 0
        end as building_year,
        FLOOR(ff_stoth) as living_area,
        refcad as cadastral_reference,
        TRY_STRPTIME(anmutation, '{{ var("dateFormat") }}') as mutation_date,
        ff_jdatat,
        ffh_jdatat,
        potentiel_tlv_thlv as taxed,
        ff_ndroit as beneficiary_count,
        batloc as building_location,
        vlcad as rental_value,
        ff_ctpdl as ownership_kind,
        ff_ccthp,
        TRY_CAST(groupe as INTEGER) as groupe,
        debutvacance as vacancy_start_year,
        aff,
        CAST(vl_revpro as INTEGER) as vl_revpro,
        potentiel_tlv_thlv,
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
        case
            when
                TRIM(proprietaire) <> ''
                then
                    REGEXP_REPLACE(
                        TRIM(CAST(proprietaire as VARCHAR)), '-', ' '
                    )
            else REGEXP_REPLACE(TRIM(gestre_ppre), '-', ' ')
        end as owner_fullname,
        case when TRIM(proprietaire) <> '' then TRIM(gestre_ppre) end
            as administrator,
        CONCAT_WS(
            NULLIF(TRIM(adresse1), ''),
            NULLIF(TRIM(adresse2), ''),
            NULLIF(TRIM(adresse3), ''),
            NULLIF(TRIM(adresse4), '')
        ) as owner_raw_address,
        ff_idprocpte,
        adresse1 as owner_adresse1,
        adresse2 as owner_adresse2,
        adresse3 as owner_adresse3,
        adresse4 as owner_adresse4,
        NULLIF(TRIM(adresse4), '') as owner_city,
        REGEXP_EXTRACT(adresse4, '\d{5}') as owner_postal_code,
        -- FF owners
        cer_ff_adresse_1 as ff_owner_1_raw_address,
        cer_ff_adresse_2 as ff_owner_2_raw_address,
        cer_ff_adresse_3 as ff_owner_3_raw_address,
        cer_ff_adresse_4 as ff_owner_4_raw_address,
        cer_ff_adresse_5 as ff_owner_5_raw_address,
        cer_ff_adresse_6 as ff_owner_6_raw_address,
        REGEXP_EXTRACT(cer_ff_adresse_1, '\d{5}') as ff_owner_1_postal_code,
        REGEXP_EXTRACT(cer_ff_adresse_2, '\d{5}') as ff_owner_2_postal_code,
        REGEXP_EXTRACT(cer_ff_adresse_3, '\d{5}') as ff_owner_3_postal_code,
        REGEXP_EXTRACT(cer_ff_adresse_4, '\d{5}') as ff_owner_4_postal_code,
        REGEXP_EXTRACT(cer_ff_adresse_5, '\d{5}') as ff_owner_5_postal_code,
        REGEXP_EXTRACT(cer_ff_adresse_6, '\d{5}') as ff_owner_6_postal_code,
        REGEXP_REPLACE(cer_ff_adresse_1, '.*\d{5}\s*', '') as ff_owner_1_city,
        REGEXP_REPLACE(cer_ff_adresse_2, '.*\d{5}\s*', '') as ff_owner_2_city,
        REGEXP_REPLACE(cer_ff_adresse_3, '.*\d{5}\s*', '') as ff_owner_3_city,
        REGEXP_REPLACE(cer_ff_adresse_4, '.*\d{5}\s*', '') as ff_owner_4_city,
        REGEXP_REPLACE(cer_ff_adresse_5, '.*\d{5}\s*', '') as ff_owner_5_city,
        REGEXP_REPLACE(cer_ff_adresse_6, '.*\d{5}\s*', '') as ff_owner_6_city,
        ff_idprodroit_1 as ff_owner_1_idprodroit,
        ff_idprodroit_2 as ff_owner_2_idprodroit,
        ff_idprodroit_3 as ff_owner_3_idprodroit,
        ff_idprodroit_4 as ff_owner_4_idprodroit,
        ff_idprodroit_5 as ff_owner_5_idprodroit,
        ff_idprodroit_6 as ff_owner_6_idprodroit,
        ff_idpersonne_1 as ff_owner_1_idpersonne,
        ff_idpersonne_2 as ff_owner_2_idpersonne,
        ff_idpersonne_3 as ff_owner_3_idpersonne,
        ff_idpersonne_4 as ff_owner_4_idpersonne,
        ff_idpersonne_5 as ff_owner_5_idpersonne,
        ff_idpersonne_6 as ff_owner_6_idpersonne,
        ff_locprop_1 as ff_owner_1_locprop,
        ff_locprop_2 as ff_owner_2_locprop,
        ff_locprop_3 as ff_owner_3_locprop,
        ff_locprop_4 as ff_owner_4_locprop,
        ff_locprop_5 as ff_owner_5_locprop,
        ff_locprop_6 as ff_owner_6_locprop,
        UPPER(ff_ddenom_1) as ff_owner_1_fullname,
        UPPER(ff_ddenom_2) as ff_owner_2_fullname,
        UPPER(ff_ddenom_3) as ff_owner_3_fullname,
        UPPER(ff_ddenom_4) as ff_owner_4_fullname,
        UPPER(ff_ddenom_5) as ff_owner_5_fullname,
        UPPER(ff_ddenom_6) as ff_owner_6_fullname,
        TRY_STRPTIME(CAST(ff_jdatnss_1 as VARCHAR), '{{ var("dateFormat") }}')
            as ff_owner_1_birth_date,
        TRY_STRPTIME(CAST(ff_jdatnss_2 as VARCHAR), '{{ var("dateFormat") }}')
            as ff_owner_2_birth_date,
        TRY_STRPTIME(CAST(ff_jdatnss_3 as VARCHAR), '{{ var("dateFormat") }}')
            as ff_owner_3_birth_date,
        TRY_STRPTIME(CAST(ff_jdatnss_4 as VARCHAR), '{{ var("dateFormat") }}')
            as ff_owner_4_birth_date,
        TRY_STRPTIME(CAST(ff_jdatnss_5 as VARCHAR), '{{ var("dateFormat") }}')
            as ff_owner_5_birth_date,
        TRY_STRPTIME(CAST(ff_jdatnss_6 as VARCHAR), '{{ var("dateFormat") }}')
            as ff_owner_6_birth_date,
        ff_catpro2txt_1 as ff_owner_1_kind,
        ff_catpro2txt_2 as ff_owner_2_kind,
        ff_catpro2txt_3 as ff_owner_3_kind,
        ff_catpro2txt_4 as ff_owner_4_kind,
        ff_catpro2txt_5 as ff_owner_5_kind,
        ff_catpro2txt_6 as ff_owner_6_kind,
        {{ process_owner_kind ('ff_catpro3_1') }} AS ff_owner_1_kind_detail,
        {{ process_owner_kind ('ff_catpro3_2') }} AS ff_owner_2_kind_detail,
        {{ process_owner_kind ('ff_catpro3_3') }} AS ff_owner_3_kind_detail,
        {{ process_owner_kind ('ff_catpro3_4') }} AS ff_owner_4_kind_detail,
        {{ process_owner_kind ('ff_catpro3_5') }} AS ff_owner_5_kind_detail,
        {{ process_owner_kind ('ff_catpro3_6') }} AS ff_owner_6_kind_detail,
        {{ process_owner_code_droit ('ff_ccodro_1') }} as ff_owner_1_code_droit,
        {{ process_owner_code_droit ('ff_ccodro_2') }} as ff_owner_2_code_droit,
        {{ process_owner_code_droit ('ff_ccodro_3') }} as ff_owner_3_code_droit,
        {{ process_owner_code_droit ('ff_ccodro_4') }} as ff_owner_4_code_droit,
        {{ process_owner_code_droit ('ff_ccodro_5') }} as ff_owner_5_code_droit,
        {{ process_owner_code_droit ('ff_ccodro_6') }} as ff_owner_6_code_droit,
        ff_dsiren_1 as ff_owner_1_siren,
        ff_dsiren_2 as ff_owner_2_siren,
        ff_dsiren_3 as ff_owner_3_siren,
        ff_dsiren_4 as ff_owner_4_siren,
        ff_dsiren_5 as ff_owner_5_siren,
        ff_dsiren_6 as ff_owner_6_siren,
        CASE
        WHEN TRIM (groupe::TEXT) = '' THEN 'Particulier'
        ELSE 'Autre'
        END AS owner_kind
