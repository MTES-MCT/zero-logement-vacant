-- int_zlovac.sql
-- This model structures the data from the LOVAC 2026 source for the ZLV pipeline.
-- It maps raw LOVAC/FF fields to standardized column names.
-- Note: Heavy geometry columns (geomrnb, ff_geomloc, ban_geom) are excluded
-- to fit MotherDuck Pulse tier memory limits. They are joined back in int_zlovac_housing (view).
-- Additional raw fields (loc_voie, libcom, ff_dvltrt, etc.) are available via int_lovac_fil_2026.

FROM {{ ref ("int_lovac_fil_2026") }}
SELECT
        -- Metadata
        annee as data_year,
        ff_millesime,
        'lovac-2026' as data_file_years,

        -- Local identification
        invariant,
        ff_idlocal as local_id,
        ff_idbat as building_id,
        ff_idpar as plot_id,
        ff_idsec as section_id,

        -- Local localisation
        loc_num,
        loc_voie,
        libvoie,
        libcom,
        ban_result_score,
        ban_result_label,
        ban_result_postcode as ban_postcode,
        ban_result_id,
        idcom,
        intercommunalite,
        TRY_CAST(ban_latitude as DOUBLE) as ban_latitude,
        TRY_CAST(ban_longitude as DOUBLE) as ban_longitude,
        REGEXP_REPLACE(
            TRIM(REGEXP_REPLACE(
                CONCAT_WS(' ',
                    NULLIF(TRIM(CAST(loc_num AS VARCHAR)), ''),
                    NULLIF(TRIM(loc_voie), ''),
                    NULLIF(TRIM(libvoie), ''),
                    NULLIF(TRIM(libcom), '')
                ),
                '^\s*0+', ''
            )),
            ' {2,}',
            ' '
        ) as dgfip_address,
        CONCAT_WS(' ', LTRIM(TRIM(libvoie), '0'), TRIM(libcom)) as raw_address,
        idcom as geo_code,
        TRY_CAST(ff_y_4326 as DOUBLE) as latitude,
        TRY_CAST(ff_x_4326 as DOUBLE) as longitude,

        -- Geolocation (RNB > FF > BAN)
        rnb_id,
        rnb_id_score,
        ff_rnb_emp as rnb_emp,
        geomrnb,
        ff_geomloc,
        ban_geom,
        CASE
            WHEN geomrnb IS NOT NULL THEN geomrnb
            WHEN ff_geomloc IS NOT NULL THEN ff_geomloc
            WHEN ban_geom IS NOT NULL THEN ban_geom
            ELSE NULL
        END AS geolocation,
        CASE
            WHEN geomrnb IS NOT NULL THEN 'bati-rnb'
            WHEN ff_geomloc IS NOT NULL THEN 'parcelle-ff'
            WHEN ban_geom IS NOT NULL THEN 'adresse-ban'
            ELSE NULL
        END AS geolocation_source,

        -- Local characteristics
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
        ff_slocal,
        ff_dcntpa as plot_area,
        ff_ndroit as beneficiary_count,
        batloc as building_location,
        ff_ctpdl as ownership_kind,

        -- Local usage
        vlcad as rental_value,
        CAST(vl_revpro as INTEGER) as vl_revpro,
        ff_dvltrt,
        aff,
        anrefthlv,
        txtlv,
        potentiel_tlv_thlv,
        case
            when potentiel_tlv_thlv = '*' then TRUE
            else FALSE
        end as taxed,
        ff_ccthp,
        ffh_ccthp,
        debutvacance as vacancy_start_year,
        cer_h1767,
        distance_ban_ff,

        -- Local mutation
        TRY_STRPTIME(anmutation, '{{ var("dateFormat") }}') as mutation_date,
        ff_jdatat,
        ffh_jdatat,

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

        -- Owner (1767 source)
        proprietaire as raw_owner_fullname,
        cer_gestionnaire,
        "cer_propriétaire" as cer_proprietaire,
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
        TRY_CAST(groupe as INTEGER) as groupe,
        CASE
            WHEN TRIM(groupe::TEXT) = '' THEN 'Particulier'
            ELSE 'Autre'
        END AS owner_kind,

        -- FF owners (1 to 6)
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
        ff_dldnss_1 as ff_owner_1_birth_place,
        ff_dldnss_2 as ff_owner_2_birth_place,
        ff_dldnss_3 as ff_owner_3_birth_place,
        ff_dldnss_4 as ff_owner_4_birth_place,
        ff_dldnss_5 as ff_owner_5_birth_place,
        ff_dldnss_6 as ff_owner_6_birth_place,
        cer_nom_usage_1 as ff_owner_1_username,
        cer_nom_usage_2 as ff_owner_2_username,
        cer_nom_usage_3 as ff_owner_3_username,
        cer_nom_usage_4 as ff_owner_4_username,
        cer_nom_usage_5 as ff_owner_5_username,
        cer_nom_usage_6 as ff_owner_6_username,
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
        {{ process_owner_property_rights ('ff_ccodro_1') }} as ff_owner_1_property_rights,
        {{ process_owner_property_rights ('ff_ccodro_2') }} as ff_owner_2_property_rights,
        {{ process_owner_property_rights ('ff_ccodro_3') }} as ff_owner_3_property_rights,
        {{ process_owner_property_rights ('ff_ccodro_4') }} as ff_owner_4_property_rights,
        {{ process_owner_property_rights ('ff_ccodro_5') }} as ff_owner_5_property_rights,
        {{ process_owner_property_rights ('ff_ccodro_6') }} as ff_owner_6_property_rights,
        ff_dsiren_1 as ff_owner_1_siren,
        ff_dsiren_2 as ff_owner_2_siren,
        ff_dsiren_3 as ff_owner_3_siren,
        ff_dsiren_4 as ff_owner_4_siren,
        ff_dsiren_5 as ff_owner_5_siren,
        ff_dsiren_6 as ff_owner_6_siren,
        ff_ccogrm_1 as ff_owner_1_entity,
        ff_ccogrm_2 as ff_owner_2_entity,
        ff_ccogrm_3 as ff_owner_3_entity,
        ff_ccogrm_4 as ff_owner_4_entity,
        ff_ccogrm_5 as ff_owner_5_entity,
        ff_ccogrm_6 as ff_owner_6_entity
