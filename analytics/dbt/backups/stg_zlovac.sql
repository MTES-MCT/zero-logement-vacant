with source as (
    select * FROM {{ source ('duckdb_raw', 'raw_zlovac') }}
),

renamed_data as (
    select
        aff,
        dir,
        sip,
        "FF X" as ff_x,
        "FF Y" as ff_y,
        annee,
        txtlv,
        vlcad,
        batloc,
        ccodep,
        groupe,
        libcom,
        nature,
        refcad,
        commune,
        libvoie,
        "LOC NUM" as loc_num,
        adresse1,
        adresse2,
        adresse3,
        adresse4,
        "FF CCTHP" as ff_ccthp,
        "DVF VEFA" as dvf_vefa,
        "FF CTPDL" as ff_ctpdl,
        "FF DNBWC" as ff_dnbwc,
        "FF IDBAT" as ff_idbat,
        "FF IDPAR" as ff_idpar,
        "FF IDSEC" as ff_idsec,
        "FF STOTH" as ff_stoth,
        "LOC VOIE" as loc_voie,
        anrefthlv,
        "DVF NBLOG" as dvf_nblog,
        "FF DNBBAI" as ff_dnbbai,
        "FF DNBDOU" as ff_dnbdou,
        "FF DVLTRT" as ff_dvltrt,
        "FF JDATAT" as ff_jdatat,
        "FF NDROIT" as ff_ndroit,
        "FF SLOCAL" as ff_slocal,
        "FF X 4326" as ff_x_4326,
        "FF Y 4326" as ff_y_4326,
        "FFH CCTHP" as ffh_ccthp,
        invariant,
        "VL REVPRO" as vl_revpro,
        anmutation,
        "DVF FILTRE" as dvf_filtre,
        "FF CATPRO3" as ff_catpro3,
        "FF DCAPEC2" as ff_dcapec2,
        "FF IDLOCAL" as ff_idlocal,
        "FF JANNATH" as ff_jannath,
        "FF LOCPROP" as ff_locprop,
        "FFH JDATAT" as ffh_jdatat,
        "DVF DATEMUT" as dvf_datemut,
        "FF DDENOM 1" as ff_ddenom_1,
        "FF DDENOM 2" as ff_ddenom_2,
        "FF DDENOM 3" as ff_ddenom_3,
        "FF DDENOM 4" as ff_ddenom_4,
        "FF DDENOM 5" as ff_ddenom_5,
        "FF DDENOM 6" as ff_ddenom_6,
        "FF DLIGN3 1" as ff_dlign3_1,
        "FF DLIGN3 2" as ff_dlign3_2,
        "FF DLIGN3 3" as ff_dlign3_3,
        "FF DLIGN3 4" as ff_dlign3_4,
        "FF DLIGN3 5" as ff_dlign3_5,
        "FF DLIGN3 6" as ff_dlign3_6,
        "FF DLIGN4 1" as ff_dlign4_1,
        "FF DLIGN4 2" as ff_dlign4_2,
        "FF DLIGN4 3" as ff_dlign4_3,
        "FF DLIGN4 4" as ff_dlign4_4,
        "FF DLIGN4 5" as ff_dlign4_5,
        "FF DLIGN4 6" as ff_dlign4_6,
        "FF DLIGN5 1" as ff_dlign5_1,
        "FF DLIGN5 2" as ff_dlign5_2,
        "FF DLIGN5 3" as ff_dlign5_3,
        "FF DLIGN5 4" as ff_dlign5_4,
        "FF DLIGN5 5" as ff_dlign5_5,
        "FF DLIGN5 6" as ff_dlign5_6,
        "FF DLIGN6 1" as ff_dlign6_1,
        "FF DLIGN6 2" as ff_dlign6_2,
        "FF DLIGN6 3" as ff_dlign6_3,
        "FF DLIGN6 4" as ff_dlign6_4,
        "FF DLIGN6 5" as ff_dlign6_5,
        "FF DLIGN6 6" as ff_dlign6_6,
        "GESTRE PPRE" as gestre_ppre,
        "BAN LATITUDE" as ban_latitude,
        "BAN LONGITUDE" as ban_longitude,
        "BAN RESULT ID" as ban_result_id,
        "BAN POSTCODE" as ban_postcode,
        "BAN RESULT LABEL" as ban_result_label,
        "BAN RESULT SCORE" as ban_result_score,
        debutvacance,
        "DVF NBLOCMUT" as dvf_nblocmut,
        "FF JDATNSS 1" as ff_jdatnss_1,
        "FF JDATNSS 2" as ff_jdatnss_2,
        "FF JDATNSS 3" as ff_jdatnss_3,
        "FF JDATNSS 4" as ff_jdatnss_4,
        "FF JDATNSS 5" as ff_jdatnss_5,
        "FF JDATNSS 6" as ff_jdatnss_6,
        "FF MILLESIME" as ff_millesime,
        "FF NPIECE P2" as ff_npiece_p2,
        "FF CATPRO2TXT" as ff_catpro2txt,
        proprietaire,
        "DVF LIBNATMUT" as dvf_libnatmut,
        "DVF CODTYPBIEN" as dvf_codtypbien,
        "DVF CODTYPPROA" as dvf_codtypproa,
        "DVF CODTYPPROV" as dvf_codtypprov,
        "DVF IDMUTATION" as dvf_idmutation,
        "DVF LIBTYPBIEN" as dvf_libtypbien,
        "DVF VALEURFONC" as dvf_valeurfonc,
        "DISTANCE BAN FF" as distance_ban_ff,
        intercommunalite,
        "POTENTIEL TLV THLV" as potentiel_tlv_thlv
    from source
),

cleaned_data as (
    select
        invariant,
        ff_idlocal as local_id,
        ff_idbat as building9_id,
        CONCAT_WS(LTRIM(TRIM(libvoie), '0'), TRIM(libcom)) as raw_address,
        LPAD(ccodep, 2, '0') || LPAD(commune, 3, '0') as geo_code,
        TRY_CAST(
            REGEXP_REPLACE(CAST(ff_y_4326 as VARCHAR), ',', '.') as DOUBLE
        ) as latitude,
        TRY_CAST(
            REGEXP_REPLACE(CAST(ff_x_4326 as VARCHAR), ',', '.') as DOUBLE
        ) as longitude,
        ff_dcapec2 as cadastral_classification,
        NULLIF(TRIM(UPPER(nature)), '') as housing_kind,
        ff_npiece_p2 as rooms_count,
        (
            COALESCE(NULLIF(TRIM(CAST(ff_dcapec2 as VARCHAR)), '')::NUMERIC, 0)
            > 6
        )
        or
        (COALESCE(NULLIF(TRIM(CAST(ff_dnbwc as VARCHAR)), '')::NUMERIC, 0) = 0)
        or
        (
            COALESCE(NULLIF(TRIM(CAST(ff_dnbbai as VARCHAR)), '')::NUMERIC, 0) +
            COALESCE(NULLIF(TRIM(CAST(ff_dnbdou as VARCHAR)), '')::NUMERIC, 0)
            = 0
        ) as uncomfortable,
        case
            when
                TRY_CAST(ff_jannath as NUMERIC) > 100
                then COALESCE(TRY_CAST(ff_jannath as NUMERIC), 0)
            else 0 -- Adding an ELSE clause to handle all other cases, ensuring a default value is always provided
        end as building_year,
        FLOOR(
            TRY_CAST(
                REGEXP_REPLACE(CAST(ff_stoth as VARCHAR), ',', '.') as NUMERIC
            )
        ) as living_area,
        refcad as cadastral_reference,
        TRY_CAST(anmutation as DATE) as mutation_date,
        case when TRIM(txtlv) = '' then NULL else TRUE end as taxed,
        annee as data_year,
        ff_ndroit as beneficiary_count,
        NULLIF(TRIM(batloc), '') as building_location,
        NULLIF(TRIM(vlcad), '') as rental_value,
        NULLIF(TRIM(ff_ctpdl), '') as ownership_kind,
        NULLIF(TRIM(ff_ccthp), '') as ff_ccthp,
        TRY_CAST(NULLIF(TRIM(groupe), '') as INTEGER) as groupe,
        TRY_CAST(debutvacance as INTEGER) as vacancy_start_year,
        aff,
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
        TRIM(
            CONCAT_WS(
                ' ',
                NULLIF(TRIM(adresse1), ''),
                NULLIF(TRIM(adresse2), ''),
                NULLIF(TRIM(adresse3), ''),
                NULLIF(TRIM(adresse4), '')
            )
        ) as owner_raw_address,
        CONCAT_WS(
            NULLIF(TRIM(adresse1), ''),
            NULLIF(TRIM(adresse2), ''),
            NULLIF(TRIM(adresse3), ''),
            NULLIF(TRIM(adresse4), '')
        ) as owner_raw_address,
        CONCAT_WS(
            NULLIF(TRIM(ff_dlign3_1), ''),
            NULLIF(TRIM(ff_dlign4_1), ''),
            NULLIF(TRIM(ff_dlign5_1), ''),
            NULLIF(TRIM(ff_dlign6_1), '')
        ) as ff_owner_1_raw_address,
        CONCAT_WS(
            NULLIF(TRIM(ff_dlign3_2), ''),
            NULLIF(TRIM(ff_dlign4_2), ''),
            NULLIF(TRIM(ff_dlign5_2), ''),
            NULLIF(TRIM(ff_dlign6_2), '')
        ) as ff_owner_2_raw_address,
        CONCAT_WS(
            NULLIF(TRIM(ff_dlign3_3), ''),
            NULLIF(TRIM(ff_dlign4_3), ''),
            NULLIF(TRIM(ff_dlign5_3), ''),
            NULLIF(TRIM(ff_dlign6_3), '')
        ) as ff_owner_3_raw_address,
        CONCAT_WS(
            NULLIF(TRIM(ff_dlign3_4), ''),
            NULLIF(TRIM(ff_dlign4_4), ''),
            NULLIF(TRIM(ff_dlign5_4), ''),
            NULLIF(TRIM(ff_dlign6_4), '')
        ) as ff_owner_4_raw_address,
        CONCAT_WS(
            NULLIF(TRIM(ff_dlign3_5), ''),
            NULLIF(TRIM(ff_dlign4_5), ''),
            NULLIF(TRIM(ff_dlign5_5), ''),
            NULLIF(TRIM(ff_dlign6_5), '')
        ) as ff_owner_5_raw_address,
        CONCAT_WS(
            NULLIF(TRIM(ff_dlign3_6), ''),
            NULLIF(TRIM(ff_dlign4_6), ''),
            NULLIF(TRIM(ff_dlign5_6), ''),
            NULLIF(TRIM(ff_dlign6_6), '')
        ) as ff_owner_6_raw_address,
        CONCAT_WS(NULLIF(TRIM(adresse1), ''), NULLIF(TRIM(adresse2), ''))
            as owner_partial_address,
        CONCAT_WS(
            NULLIF(TRIM(ff_dlign3_1), ''), NULLIF(TRIM(ff_dlign4_1), '')
        ) as ff_owner_1_partial_address,
        CONCAT_WS(
            NULLIF(TRIM(ff_dlign3_2), ''), NULLIF(TRIM(ff_dlign4_2), '')
        ) as ff_owner_2_partial_address,
        CONCAT_WS(
            NULLIF(TRIM(ff_dlign3_3), ''), NULLIF(TRIM(ff_dlign4_3), '')
        ) as ff_owner_3_partial_address,
        CONCAT_WS(
            NULLIF(TRIM(ff_dlign3_4), ''), NULLIF(TRIM(ff_dlign4_4), '')
        ) as ff_owner_4_partial_address,
        CONCAT_WS(
            NULLIF(TRIM(ff_dlign3_5), ''), NULLIF(TRIM(ff_dlign4_5), '')
        ) as ff_owner_5_partial_address,
        CONCAT_WS(
            NULLIF(TRIM(ff_dlign3_6), ''), NULLIF(TRIM(ff_dlign4_6), '')
        ) as ff_owner_6_partial_address,
        NULLIF(TRIM(adresse4), '') as owner_city,
        NULLIF(TRIM(ff_dlign6_1), '') as ff_owner_1_city,
        NULLIF(TRIM(ff_dlign6_2), '') as ff_owner_2_city,
        NULLIF(TRIM(ff_dlign6_3), '') as ff_owner_3_city,
        NULLIF(TRIM(ff_dlign6_4), '') as ff_owner_4_city,
        NULLIF(TRIM(ff_dlign6_5), '') as ff_owner_5_city,
        NULLIF(TRIM(ff_dlign6_6), '') as ff_owner_6_city,
        adresse1 as owner_adresse1,
        adresse2 as owner_adresse2,
        adresse3 as owner_adresse3,
        adresse4 as owner_adresse4,
        ff_dlign3_1 as ff_owner_1_adresse_1,
        ff_dlign4_1 as ff_owner_1_adresse_2,
        ff_dlign5_1 as ff_owner_1_adresse_3,
        ff_dlign6_1 as ff_owner_1_adresse_4,
        ff_dlign3_2 as ff_owner_2_adresse_1,
        ff_dlign4_2 as ff_owner_2_adresse_2,
        ff_dlign5_2 as ff_owner_2_adresse_3,
        ff_dlign6_2 as ff_owner_2_adresse_4,
        ff_dlign3_3 as ff_owner_3_adresse_1,
        ff_dlign4_3 as ff_owner_3_adresse_2,
        ff_dlign5_3 as ff_owner_3_adresse_3,
        ff_dlign6_3 as ff_owner_3_adresse_4,
        ff_dlign3_4 as ff_owner_4_adresse_1,
        ff_dlign4_4 as ff_owner_4_adresse_2,
        ff_dlign5_4 as ff_owner_4_adresse_3,
        ff_dlign6_4 as ff_owner_4_adresse_4,
        ff_dlign3_5 as ff_owner_5_adresse_1,
        ff_dlign4_5 as ff_owner_5_adresse_2,
        ff_dlign5_5 as ff_owner_5_adresse_3,
        ff_dlign6_5 as ff_owner_5_adresse_4,
        ff_dlign3_6 as ff_owner_6_adresse_1,
        ff_dlign4_6 as ff_owner_6_adresse_2,
        ff_dlign5_6 as ff_owner_6_adresse_3,
        ff_dlign6_6 as ff_owner_6_adresse_4,
        UPPER(ff_ddenom_1) as ff_owner_1_fullname,
        UPPER(ff_ddenom_2) as ff_owner_2_fullname,
        UPPER(ff_ddenom_3) as ff_owner_3_fullname,
        UPPER(ff_ddenom_4) as ff_owner_4_fullname,
        UPPER(ff_ddenom_5) as ff_owner_5_fullname,
        UPPER(ff_ddenom_6) as ff_owner_6_fullname,
        TRY_CAST(ff_jdatnss_1 as DATE) as ff_owner_1_birth_date,
        TRY_CAST(ff_jdatnss_2 as DATE) as ff_owner_2_birth_date,
        TRY_CAST(ff_jdatnss_3 as DATE) as ff_owner_3_birth_date,
        TRY_CAST(ff_jdatnss_4 as DATE) as ff_owner_4_birth_date,
        TRY_CAST(ff_jdatnss_5 as DATE) as ff_owner_5_birth_date,
        TRY_CAST(ff_jdatnss_6 as DATE) as ff_owner_6_birth_date,
        case
            when TRIM(groupe::TEXT) = '' then 'Particulier'
            when
                not (
                    owner_fullname like '%'
                    || SPLIT_PART(TRIM(ff_ddenom_1), '/', 1)
                    || '%'
                )
                and not (
                    owner_fullname like '%'
                    || SPLIT_PART(SPLIT_PART(TRIM(ff_ddenom_1), '/', 2), ' ', 1)
                    || '%'
                )
                then 'Autre'
            when
                ff_catpro2txt = 'INVESTISSEUR PROFESSIONNEL'
                then 'Investisseur'
            when
                ff_catpro2txt = 'SOCIETE CIVILE A VOCATION IMMOBILIERE'
                then 'SCI'
            else ff_catpro2txt
        end as owner_kind_detail,
        case
            when TRIM(groupe::TEXT) = '' then 'Particulier'
            else 'Autre'
        end as owner_kind
    from
        renamed_data
)

select * from cleaned_data
