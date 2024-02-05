DROP MATERIALIZED VIEW IF EXISTS lovac;
DROP TABLE IF EXISTS _extract_zlv_;
CREATE TABLE _extract_zlv_
(
    ccodep             TEXT,
    annee              TEXT,
    dir                TEXT,
    sip                INTEGER,
    commune            TEXT,
    intercommunalite   TEXT,
    gestre_ppre        TEXT,
    proprietaire       TEXT,
    adresse1           TEXT,
    adresse2           TEXT,
    adresse3           TEXT,
    adresse4           TEXT,
    groupe             TEXT,
    nature             TEXT,
    loc_voie           TEXT,
    loc_num            TEXT,
    invariant          TEXT,
    refcad             TEXT,
    batloc             TEXT,
    vlcad              TEXT,
    vl_revpro          TEXT,
    aff                TEXT,
    anmutation         TEXT,
    libvoie            TEXT,
    libcom             TEXT,
    debutvacance       INTEGER,
    anrefthlv          INTEGER,
    txtlv              TEXT,
    potentiel_tlv_thlv TEXT,
    ff_idlocal         TEXT,
    ff_millesime       INTEGER,
    ff_idsec           TEXT,
    ff_idbat           TEXT,
    ff_ctpdl           TEXT,
    ff_stoth           TEXT,
    ff_slocal          TEXT,
    ff_npiece_p2       INTEGER,
    ff_jannath         INTEGER,
    ff_jdatat          INTEGER,
    ff_ndroit          INTEGER,
    ff_dnbbai          INTEGER,
    ff_dnbdou          INTEGER,
    ff_dnbwc           INTEGER,
    ff_dcapec2         INTEGER,
    ff_ccthp           TEXT,
    ff_jdatnss_1       TEXT,
    ff_ddenom_1        TEXT,
    ff_dlign3_1        TEXT,
    ff_dlign4_1        TEXT,
    ff_dlign5_1        TEXT,
    ff_dlign6_1        TEXT,
    ff_jdatnss_2       TEXT,
    ff_ddenom_2        TEXT,
    ff_dlign3_2        TEXT,
    ff_dlign4_2        TEXT,
    ff_dlign5_2        TEXT,
    ff_dlign6_2        TEXT,
    ff_jdatnss_3       TEXT,
    ff_ddenom_3        TEXT,
    ff_dlign3_3        TEXT,
    ff_dlign4_3        TEXT,
    ff_dlign5_3        TEXT,
    ff_dlign6_3        TEXT,
    ff_jdatnss_4       TEXT,
    ff_ddenom_4        TEXT,
    ff_dlign3_4        TEXT,
    ff_dlign4_4        TEXT,
    ff_dlign5_4        TEXT,
    ff_dlign6_4        TEXT,
    ff_jdatnss_5       TEXT,
    ff_ddenom_5        TEXT,
    ff_dlign3_5        TEXT,
    ff_dlign4_5        TEXT,
    ff_dlign5_5        TEXT,
    ff_dlign6_5        TEXT,
    ff_jdatnss_6       TEXT,
    ff_ddenom_6        TEXT,
    ff_dlign3_6        TEXT,
    ff_dlign4_6        TEXT,
    ff_dlign5_6        TEXT,
    ff_dlign6_6        TEXT,
    ff_catpro2txt      TEXT,
    ff_catpro3         TEXT,
    ff_locprop         INTEGER,
    ff_x               TEXT,
    ff_y               TEXT,
    ff_x_4326          TEXT,
    ff_y_4326          TEXT,
    ff_idpar           TEXT,
    ff_dvltrt          INTEGER,
    ban_result_score   DECIMAL,
    ban_result_label   TEXT,
    ban_postcode       TEXT,
    ban_result_id      TEXT,
    ban_latitude       TEXT,
    ban_longitude      TEXT,
    distance_ban_ff    DECIMAL,
    dvf_nblocmut       INTEGER,
    dvf_nblog          INTEGER,
    dvf_valeurfonc     DECIMAL,
    dvf_datemut        TEXT,
    dvf_idmutation     INTEGER,
    dvf_libnatmut      TEXT,
    dvf_vefa           BOOLEAN,
    dvf_codtypbien     TEXT,
    dvf_libtypbien     TEXT,
    dvf_filtre         TEXT,
    dvf_codtypprov     TEXT,
    dvf_codtypproa     TEXT,
    ffh_ccthp          TEXT,
    ffh_jdatat         TEXT
);

DROP INDEX IF EXISTS _extract_zlv__ff_idlocal_ff_ccthp_index;
CREATE INDEX _extract_zlv__ff_idlocal_ff_ccthp_index
    ON _extract_zlv_ (ff_idlocal, ff_ccthp);

\set copy '\\COPY _extract_zlv_ FROM ' :filePath ' DELIMITER '';'' CSV HEADER;'
:copy

UPDATE _extract_zlv_ SET anmutation = '28/02/1999' WHERE anmutation = '31/02/1999';
UPDATE _extract_zlv_ SET anmutation = '01/01/' || substr(anmutation, 3) WHERE anmutation ~ '^[0-9]{4}';
UPDATE _extract_zlv_ SET anmutation = '01/' || substr(anmutation, 6) WHERE anmutation ~ '^[0-9]{2}/[0-9]{4}';

CREATE MATERIALIZED VIEW lovac AS
SELECT
  invariant,
     ff_idlocal as local_id,
     ff_idbat as building_id,
     array[ltrim(trim(libvoie), '0'), trim(libcom)] as raw_address,
     lpad(ccodep, 2, '0') || lpad(commune, 3, '0') as geo_code,
     replace(ff_y_4326, ',', '.')::double precision as latitude,
     replace(ff_x_4326, ',', '.')::double precision as longitude,
     ff_dcapec2 as cadastral_classification,
     (coalesce(ff_dcapec2, 0) > 6) OR (ff_dnbwc = 0) OR (ff_dnbbai + ff_dnbdou = 0) as uncomfortable,
     debutvacance as vacancy_start_year,
     trim(nature) as housing_kind,
     ff_npiece_p2 as rooms_count,
     floor(replace(ff_stoth, ',', '.')::numeric) as living_area,
     refcad as cadastral_reference,
     (case when (ff_jannath > 100) then ff_jannath end) as building_year,
     (case
         when (anmutation like '%/%/%') then to_date(anmutation, :dateFormat)
         else to_date('01/01/' || anmutation, :dateFormat)  end) as mutation_date,
     trim(txtlv) <> '' as taxed,
     trim(annee) as data_year,
     ff_ndroit as beneficiary_count,
     trim(batloc) as building_location,
     trim(vlcad) as rental_value,
     trim(ff_ctpdl) as ownership_kind,
     upper(var.owner) as full_name,
     var.administrator as administrator,
     array_remove(array[nullif(trim(adresse1), ''), nullif(trim(adresse2), ''), nullif(trim(adresse3), ''), nullif(trim(adresse4), '')], null) as owner_raw_address,
     (case
         when ff_jdatnss_1 <> '0' and ff_jdatnss_1 not like '00/%/%' and ff_jdatnss_1 not like '%/%/18%' and (
             (var.owner like '%' || split_part(trim(ff_ddenom_1), '/', 1) || '%') or
             (var.owner like '%' || split_part(split_part(trim(ff_ddenom_1), '/', 2), ' ', 1) || '%')) then to_date(ff_jdatnss_1 || ' 20', :dateFormat) end) as birth_date,
     (case
         when trim(groupe::TEXT) = '' then 'Particulier'
         when not(var.owner like '%' || split_part(trim(ff_ddenom_1), '/', 1) || '%') and
              not(var.owner like '%' || split_part(split_part(trim(ff_ddenom_1), '/', 2), ' ', 1) || '%') then 'Autre'
         when ff_catpro2txt = 'INVESTISSEUR PROFESSIONNEL' then 'Investisseur'
         when ff_catpro2txt = 'SOCIETE CIVILE A VOCATION IMMOBILIERE' then 'SCI'
         else 'Autre' end) as owner_kind,
     (case
         when trim(groupe::TEXT) = '' then 'Particulier'
         when not(var.owner like '%' || split_part(trim(ff_ddenom_1), '/', 1) || '%') and
              not(var.owner like '%' || split_part(split_part(trim(ff_ddenom_1), '/', 2), ' ', 1) || '%') then 'Autre'
         when ff_catpro2txt = 'INVESTISSEUR PROFESSIONNEL' then 'Investisseur'
         when ff_catpro2txt = 'SOCIETE CIVILE A VOCATION IMMOBILIERE' then 'SCI'
         else ff_catpro2txt end) as owner_kind_detail,
     upper(ff_ddenom_2) as full_name2,
     array_remove(array[nullif(trim(ff_dlign3_2), ''), nullif(trim(ff_dlign4_2), ''), nullif(trim(ff_dlign5_2), ''), nullif(trim(ff_dlign6_2), '')], null) as owner_raw_address2,
     (case when ff_jdatnss_2 <> '0' and ff_jdatnss_2 not like '00/%/%' and ff_jdatnss_2 not like '%/%/18%' then to_date(ff_jdatnss_2 || ' 20', :dateFormat) end) as birth_date2,
     upper(ff_ddenom_3) as full_name3,
     array_remove(array[nullif(trim(ff_dlign3_3), ''), nullif(trim(ff_dlign4_3), ''), nullif(trim(ff_dlign5_3), ''), nullif(trim(ff_dlign6_3), '')], null) as owner_raw_address3,
     (case when ff_jdatnss_3 <> '0' and ff_jdatnss_3 not like '00/%/%' and ff_jdatnss_3 not like '%/%/18%' then to_date(ff_jdatnss_3 || ' 20', :dateFormat) end) as birth_date3,
     upper(ff_ddenom_4) as full_name4,
     array_remove(array[nullif(trim(ff_dlign3_4), ''), nullif(trim(ff_dlign4_4), ''), nullif(trim(ff_dlign5_4), ''), nullif(trim(ff_dlign6_4), '')], null) as owner_raw_address4,
     (case when ff_jdatnss_4 <> '0' and ff_jdatnss_4 not like '00/%/%' and ff_jdatnss_4 not like '%/%/18%' then to_date(ff_jdatnss_4 || ' 20', :dateFormat) end) as birth_date4,
     upper(ff_ddenom_5) as full_name5,
     array_remove(array[nullif(trim(ff_dlign3_5), ''), nullif(trim(ff_dlign4_5), ''), nullif(trim(ff_dlign5_5), ''), nullif(trim(ff_dlign6_5), '')], null) as owner_raw_address5,
     (case when ff_jdatnss_5 <> '0' and ff_jdatnss_5 not like '00/%/%' and ff_jdatnss_5 not like '%/%/18%' then to_date(ff_jdatnss_5 || ' 20', :dateFormat) end) as birth_date5,
     upper(ff_ddenom_6) as full_name6,
     array_remove(array[nullif(trim(ff_dlign3_6), ''), nullif(trim(ff_dlign4_6), ''), nullif(trim(ff_dlign5_6), ''), nullif(trim(ff_dlign6_6), '')], null) as owner_raw_address6,
     (case when ff_jdatnss_6 <> '0' and ff_jdatnss_6 not like '00/%/%' and ff_jdatnss_6 not like '%/%/18%' then to_date(ff_jdatnss_6 || ' 20', :dateFormat) end) as birth_date6
  from _extract_zlv_, lateral (
          select (case when trim(proprietaire) <> '' then trim(proprietaire) else trim(gestre_ppre) end) as owner,
                 (case when trim(proprietaire) <> '' then trim(gestre_ppre) end) as administrator) var
  where ff_ccthp in ('V')
  and debutvacance <= 2020
  and groupe not in ('1','2','3','4','5','6','9')
  and aff='H'
  and upper(nature) in ('APPART','MAISON')
  and ff_idlocal is not null
  and owner is not null
  group by invariant, local_id, building_id, raw_address, geo_code, latitude, longitude, cadastral_classification, uncomfortable, vacancy_start_year,
           housing_kind, rooms_count, living_area, cadastral_reference, building_year, mutation_date, taxed, annee, ff_ndroit, ff_ndroit, batloc, vlcad, ff_ctpdl,
           owner, administrator, birth_date, adresse1, adresse2, adresse3, adresse4, ff_ddenom_1, owner_kind, owner_kind_detail,
           full_name2, birth_date2, owner_raw_address2, full_name3, birth_date3, owner_raw_address3, full_name3, birth_date3, owner_raw_address3,
           full_name4, birth_date4, owner_raw_address4, full_name5, birth_date5, owner_raw_address5, full_name6, birth_date6, owner_raw_address6
  with data;


DROP INDEX IF EXISTS lovac_local_id_index;
CREATE INDEX lovac_local_id_index
    ON lovac (local_id);
